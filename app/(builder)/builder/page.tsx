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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
          Welcome back, {firstName}
        </h1>
        {builderProfile?.company && (
          <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">{builderProfile.company}</p>
        )}
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
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-900 dark:text-zinc-100">
                Recent projects
              </h2>
              <Link
                href="/builder/projects"
                className="text-sm font-medium text-brand-accent hover:text-brand-accent-h"
              >
                View all
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
                    className="group flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-sm transition-all hover:border-stone-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusDot status={p.status} />
                        <span className="font-semibold text-stone-900 truncate dark:text-zinc-100">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-sm text-stone-500 dark:text-zinc-400">
                        {[p.type, p.city].filter(Boolean).join(" · ") || "No location"}
                        {" · "}
                        {p._count.requirements} requirement{p._count.requirements !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                ))}
                <Link
                  href="/builder/projects/new"
                  className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white px-5 py-4 text-sm font-medium text-stone-500 transition-colors hover:border-brand-accent hover:text-brand-accent dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
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
      className={`flex flex-col gap-3 rounded-xl border p-5 shadow-sm ${
        accent
          ? "border-brand-border bg-brand-bg dark:border-zinc-800 dark:bg-zinc-900"
          : warm
            ? "border-amber-100 bg-amber-50 dark:border-zinc-800 dark:bg-zinc-900"
            : "border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          accent
            ? "bg-brand-accent text-white"
            : warm
              ? "bg-amber-100 text-amber-700"
              : "bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-stone-900 dark:text-zinc-100">{value}</p>
        <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  );
}

function EmptyProjectsCTA() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-bg text-brand-accent">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
          <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
          <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
          <path d="M4 15v-3a6 6 0 0 1 6-6" />
          <path d="M14 6a6 6 0 0 1 6 6v3" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-stone-900 dark:text-zinc-100">No projects yet</p>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
          Create your first project to start adding material requirements.
        </p>
      </div>
      <Link
        href="/builder/projects/new"
        className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-accent-h"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
        Create first project
      </Link>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-stone-400",
    ACTIVE: "bg-green-500",
    COMPLETED: "bg-blue-500",
    ARCHIVED: "bg-stone-300",
  };
  return (
    <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${colors[status] ?? "bg-stone-400"}`} />
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
