import Link from "next/link";
import { db } from "@/lib/db";
import { UserActions } from "@/components/admin/UserActions";
import type { UserStatus } from "@prisma/client";

const STATUSES: UserStatus[] = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"];

const STATUS_STYLE: Record<UserStatus, { badge: string; dot: string }> = {
  PENDING: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  VERIFIED: {
    badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    dot: "bg-green-500",
  },
  REJECTED: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-400",
  },
  SUSPENDED: {
    badge: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
    dot: "bg-zinc-400",
  },
};

const ROLE_STYLE: Record<"BUILDER" | "VENDOR", string> = {
  BUILDER: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  VENDOR: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const statusFilter = STATUSES.includes(status as UserStatus) ? (status as UserStatus) : undefined;

  const [users, counts] = await Promise.all([
    db.user.findMany({
      where: {
        role: { not: "ADMIN" },
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: { builderProfile: true, vendorProfile: true },
      orderBy: { createdAt: "asc" },
    }),
    db.user.groupBy({
      by: ["status"],
      where: { role: { not: "ADMIN" } },
      _count: { id: true },
    }),
  ]);

  const countByStatus: Partial<Record<UserStatus, number>> = {};
  for (const row of counts) {
    countByStatus[row.status] = row._count.id;
  }
  const totalCount = Object.values(countByStatus).reduce((a, b) => a + b, 0);

  const builders = users.filter((u) => u.role === "BUILDER");
  const vendors = users.filter((u) => u.role === "VENDOR");

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Verification Queue
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage builder and vendor account verification.
          </p>
        </div>

        {/* Status filter tabs */}
        <nav className="flex flex-wrap gap-1.5" aria-label="Filter by status">
          <FilterTab href="/admin/users" active={!statusFilter} count={totalCount} label="All" />
          {STATUSES.map((s) => (
            <FilterTab
              key={s}
              href={`/admin/users?status=${s}`}
              active={statusFilter === s}
              count={countByStatus[s] ?? 0}
              label={s.charAt(0) + s.slice(1).toLowerCase()}
              dotColor={STATUS_STYLE[s].dot}
            />
          ))}
        </nav>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No users{statusFilter ? ` with status "${statusFilter}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RoleGroup title="Builders" role="BUILDER" users={builders} statusFilter={statusFilter} />
          <RoleGroup title="Vendors" role="VENDOR" users={vendors} statusFilter={statusFilter} />
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
      {dotColor && (
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      )}
      {label}
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
            active
              ? "bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900"
              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/* ─── Role group card ───────────────────────────────────────────── */
function RoleGroup({
  title,
  role,
  users,
  statusFilter,
}: {
  title: string;
  role: "BUILDER" | "VENDOR";
  users: Array<{
    id: string;
    phone: string;
    status: UserStatus;
    role: "BUILDER" | "VENDOR" | "ADMIN";
    builderProfile: { name: string | null; company: string | null; email: string | null; city: string | null } | null;
    vendorProfile: { name: string | null; company: string | null; email: string | null; city: string | null; gst: string | null } | null;
  }>;
  statusFilter?: UserStatus;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${ROLE_STYLE[role]}`}>
          {role}
        </span>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
          {users.length} {users.length === 1 ? "user" : "users"}
          {statusFilter ? ` · ${statusFilter.toLowerCase()}` : ""}
        </span>
      </div>

      {users.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          No {title.toLowerCase()}{statusFilter ? ` (${statusFilter.toLowerCase()})` : ""}.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {users.map((user) => {
            const p = role === "BUILDER" ? user.builderProfile : user.vendorProfile;
            const gst = role === "VENDOR" ? (user.vendorProfile as { gst: string | null } | null)?.gst : undefined;
            return (
              <li key={user.id} className="flex flex-col gap-4 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Avatar + info */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                        {(p?.name ?? user.phone).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {p?.name ?? "—"}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[user.status].badge}`}>
                          {user.status}
                        </span>
                      </div>
                      {p?.company && (
                        <p className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
                          {p.company}
                        </p>
                      )}
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                        <span>{user.phone}</span>
                        {p?.email && <span>{p.email}</span>}
                        {p?.city && <span>{p.city}</span>}
                        {gst && <span>GST: {gst}</span>}
                      </div>
                    </div>
                  </div>

                  {role === "VENDOR" && (
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      Categories
                    </Link>
                  )}
                </div>

                <UserActions userId={user.id} currentStatus={user.status} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
