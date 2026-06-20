import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AccountStatusBanner } from "@/components/auth/AccountStatusBanner";

export default async function BuilderDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, builderProfile] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId }, select: { status: true } }),
    db.builderProfile.findUnique({
      where: { userId: session.userId },
      select: { name: true, company: true },
    }),
  ]);
  if (!user) redirect("/login");

  const isVerified = user.status === "VERIFIED";

  const [totalProjects, activeProjects, openReqs, awardedReqs, recentProjects] = isVerified
    ? await Promise.all([
        db.project.count({ where: { builderId: session.userId } }),
        db.project.count({ where: { builderId: session.userId, status: "ACTIVE" } }),
        db.requirement.count({ where: { project: { builderId: session.userId }, status: "OPEN" } }),
        db.requirement.count({ where: { project: { builderId: session.userId }, status: "AWARDED" } }),
        db.project.findMany({
          where: { builderId: session.userId },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            name: true,
            type: true,
            city: true,
            status: true,
            createdAt: true,
            _count: { select: { requirements: true } },
          },
        }),
      ])
    : [0, 0, 0, 0, []];

  const firstName = builderProfile?.name?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/50 bg-white/60 p-8 shadow-sm backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/60">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-accent/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-brand-bg/50 blur-3xl dark:bg-brand-accent/5" />
        
        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-accent opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-accent"></span>
            </span>
            Overview
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
            Welcome back, {firstName}
          </h1>
          {builderProfile?.company && (
            <p className="mt-2 max-w-xl text-base text-stone-500 dark:text-zinc-400">
              Here's what's happening with <span className="font-semibold text-stone-800 dark:text-zinc-200">{builderProfile.company}</span> today.
            </p>
          )}
        </div>
      </div>

      <AccountStatusBanner status={user.status} />

      {isVerified && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total projects" value={totalProjects} icon={<IcFolder />} />
            <StatCard label="Active projects" value={activeProjects} icon={<IcActivity />} accent />
            <StatCard label="Open requirements" value={openReqs} icon={<IcClipboard />} />
            <StatCard label="Awarded" value={awardedReqs} icon={<IcAward />} warm />
          </div>

          {/* Recent projects */}
          <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
                Recent projects
              </h2>
              <Link
                href="/builder/projects"
                className="text-sm font-semibold text-brand-accent transition-colors hover:text-brand-accent-h"
              >
                View all &rarr;
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <EmptyProjectsCTA />
            ) : (
              <div className="flex flex-col gap-3">
                {(recentProjects as typeof recentProjects).map((p) => (
                  <Link
                    key={p.id}
                    href={`/builder/projects/${p.id}`}
                    className="group relative overflow-hidden rounded-2xl border border-stone-200/50 bg-white/60 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-border/80 hover:shadow-xl hover:shadow-brand-accent/5 dark:border-zinc-800/50 dark:bg-zinc-900/60 dark:hover:border-brand-accent/30"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-bg/0 via-brand-bg/0 to-brand-bg/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:to-brand-accent/10" />
                    <div className="relative z-10 flex items-center justify-between gap-4">
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={p.status} />
                          <span className="truncate font-semibold text-stone-900 dark:text-zinc-100">
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-stone-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                            </svg>
                            {[p.type, p.city].filter(Boolean).join(" · ") || "No location"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                              <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            </svg>
                            {p._count.requirements} requirement{p._count.requirements !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400 transition-all duration-300 group-hover:bg-brand-accent group-hover:text-white dark:bg-zinc-800 dark:group-hover:bg-brand-accent">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
                <Link
                  href="/builder/projects/new"
                  className="group flex items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-transparent px-5 py-4 text-sm font-medium text-stone-500 transition-all hover:border-brand-accent hover:bg-brand-accent/5 hover:text-brand-accent dark:border-zinc-700 dark:hover:border-brand-accent dark:hover:bg-brand-accent/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform duration-300 group-hover:scale-110">
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  New project
                </Link>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  warm,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
  warm?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        accent
          ? "border-brand-border/60 bg-brand-bg/50 hover:shadow-brand-accent/10 dark:border-brand-accent/20 dark:bg-brand-accent/5"
          : warm
            ? "border-amber-200/60 bg-amber-50/50 hover:shadow-amber-500/10 dark:border-amber-500/20 dark:bg-amber-500/5"
            : "border-stone-200/50 bg-white/60 hover:shadow-stone-200/50 dark:border-zinc-800/50 dark:bg-zinc-900/50 dark:hover:shadow-black/50"
      } backdrop-blur-xl`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-white/5" />
      <div className="relative z-10 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner ${
            accent
              ? "bg-gradient-to-br from-brand-accent to-brand-accent-h text-white"
              : warm
                ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
                : "bg-gradient-to-br from-stone-100 to-stone-200 text-stone-600 dark:from-zinc-800 dark:to-zinc-900 dark:text-zinc-400"
          }`}
        >
          {icon}
        </div>
      </div>
      <div className="relative z-10 mt-5">
        <p className="text-4xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">{value}</p>
        <p className="mt-1 text-sm font-semibold text-stone-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

function EmptyProjectsCTA() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-stone-200/50 bg-white/60 px-6 py-16 text-center backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-900/60">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-bg to-brand-border text-brand-accent shadow-inner dark:from-zinc-800 dark:to-zinc-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
            <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
            <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
            <path d="M4 15v-3a6 6 0 0 1 6-6" />
            <path d="M14 6a6 6 0 0 1 6 6v3" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-stone-900 dark:text-zinc-100">No projects yet</p>
          <p className="mt-1.5 max-w-sm text-sm text-stone-500 dark:text-zinc-400">
            Create your first project to start organizing material requirements and receiving bids from top vendors.
          </p>
        </div>
        <Link
          href="/builder/projects/new"
          className="group relative mt-2 inline-flex items-center gap-2 overflow-hidden rounded-xl bg-brand-accent px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-accent/25 transition-all hover:-translate-y-0.5 hover:shadow-brand-accent/40"
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 relative z-10">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span className="relative z-10">Create first project</span>
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    DRAFT: { bg: "bg-stone-100 dark:bg-zinc-800", text: "text-stone-600 dark:text-zinc-300", dot: "bg-stone-400", label: "Draft" },
    ACTIVE: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500", label: "Active" },
    COMPLETED: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500", label: "Completed" },
    ARCHIVED: { bg: "bg-stone-100 dark:bg-zinc-800", text: "text-stone-500 dark:text-zinc-400", dot: "bg-stone-300", label: "Archived" },
  };
  const config = configs[status] ?? configs.DRAFT;
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

function IcFolder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IcActivity() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IcClipboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  );
}
function IcAward() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}
