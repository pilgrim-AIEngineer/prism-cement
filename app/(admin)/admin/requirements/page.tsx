import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RequirementStatus } from "@prisma/client";

const STATUSES: RequirementStatus[] = ["OPEN", "AWARDED", "COMPLETED", "CLOSED", "DRAFT", "REOPENED"];

const STATUS_STYLE: Record<RequirementStatus, { badge: string; dot: string; label: string }> = {
  DRAFT:     { badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400", dot: "bg-zinc-400", label: "Draft" },
  OPEN:      { badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", dot: "bg-blue-500", label: "Open" },
  CLOSED:    { badge: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300", dot: "bg-zinc-500", label: "Closed" },
  AWARDED:   { badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", dot: "bg-amber-500", label: "Awarded" },
  COMPLETED: { badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", dot: "bg-green-500", label: "Completed" },
  REOPENED:  { badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300", dot: "bg-purple-500", label: "Reopened" },
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminRequirementsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { status } = await searchParams;
  const statusFilter = STATUSES.includes(status as RequirementStatus)
    ? (status as RequirementStatus)
    : undefined;

  const [requirements, counts] = await Promise.all([
    db.requirement.findMany({
      where: statusFilter ? { status: statusFilter } : {},
      select: {
        id: true,
        anonCode: true,
        status: true,
        cityZone: true,
        createdAt: true,
        category: { select: { name: true } },
        project: {
          select: {
            name: true,
            builder: {
              select: {
                phone: true,
                builderProfile: { select: { name: true, company: true } },
              },
            },
          },
        },
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.requirement.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const countByStatus: Partial<Record<RequirementStatus, number>> = {};
  for (const row of counts) countByStatus[row.status] = row._count.id;
  const totalCount = Object.values(countByStatus).reduce((a, b) => a + b, 0);
  const openCount = countByStatus["OPEN"] ?? 0;
  const awardedCount = countByStatus["AWARDED"] ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Bid Review
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Review bids and select vendors to connect with builders.
          </p>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-2">
          {openCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {openCount} open
            </span>
          )}
          {awardedCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {awardedCount} awarded
            </span>
          )}
        </div>
      </div>

      {/* Status filter tabs */}
      <nav className="flex flex-wrap gap-1.5" aria-label="Filter by status">
        <FilterTab
          href="/admin/requirements"
          active={!statusFilter}
          label="All"
          count={totalCount}
        />
        {STATUSES.map((s) => (
          <FilterTab
            key={s}
            href={`/admin/requirements?status=${s}`}
            active={statusFilter === s}
            label={STATUS_STYLE[s].label}
            count={countByStatus[s] ?? 0}
            dotColor={STATUS_STYLE[s].dot}
          />
        ))}
      </nav>

      {/* Requirements list */}
      {requirements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No requirements{statusFilter ? ` with status "${STATUS_STYLE[statusFilter].label}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {requirements.length} requirement{requirements.length !== 1 ? "s" : ""}
              {statusFilter ? ` · ${STATUS_STYLE[statusFilter].label}` : ""}
            </p>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {requirements.map((req) => {
              const bp = req.project.builder.builderProfile;
              const builderLabel = bp
                ? `${bp.name} · ${bp.company}`
                : req.project.builder.phone;
              const { badge, dot } = STATUS_STYLE[req.status];
              const hasBids = req._count.bids > 0;

              return (
                <li key={req.id}>
                  <Link
                    href={`/admin/requirements/${req.id}`}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    {/* Status dot */}
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />

                    {/* Main content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                          {req.anonCode}
                        </span>
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {req.category.name}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>
                          {STATUS_STYLE[req.status].label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {req.project.name} · {builderLabel}
                        {req.cityZone ? ` · ${req.cityZone}` : ""}
                      </p>
                    </div>

                    {/* Right side: bid count + date */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          hasBids
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {req._count.bids} bid{req._count.bids !== 1 ? "s" : ""}
                      </span>
                      <time className="text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
                        {new Date(req.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>

                    <span className="shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-700 dark:group-hover:text-zinc-400">
                      ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─── Filter tab ────────────────────────────────────────────────── */
function FilterTab({
  href,
  active,
  label,
  count,
  dotColor,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  dotColor?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      }`}
    >
      {dotColor && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
      {label}
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
            active
              ? "bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900"
              : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
