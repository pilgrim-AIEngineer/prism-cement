import Link from "next/link";
import { db } from "@/lib/db";
import { UserActions } from "@/components/admin/UserActions";
import type { UserStatus } from "@prisma/client";

const STATUSES: UserStatus[] = ["PENDING", "VERIFIED", "REJECTED", "SUSPENDED"];

const STATUS_BADGE: Record<UserStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  VERIFIED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  SUSPENDED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const statusFilter = STATUSES.includes(status as UserStatus) ? (status as UserStatus) : undefined;

  const users = await db.user.findMany({
    where: {
      role: { not: "ADMIN" },
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: { builderProfile: true, vendorProfile: true },
    orderBy: { createdAt: "asc" },
  });

  const builders = users.filter((u) => u.role === "BUILDER");
  const vendors = users.filter((u) => u.role === "VENDOR");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Verification Queue</h2>
        <nav className="flex flex-wrap gap-1.5">
          <FilterLink href="/admin/users" active={!statusFilter}>
            All
          </FilterLink>
          {STATUSES.map((s) => (
            <FilterLink key={s} href={`/admin/users?status=${s}`} active={statusFilter === s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </FilterLink>
          ))}
        </nav>
      </div>

      <RoleSection title="Builders" count={builders.length} statusFilter={statusFilter}>
        {builders.map((user) => {
          const p = user.builderProfile;
          return (
            <UserCard
              key={user.id}
              userId={user.id}
              phone={user.phone}
              status={user.status}
              role="BUILDER"
              name={p?.name}
              company={p?.company}
              email={p?.email ?? undefined}
              city={p?.city ?? undefined}
            />
          );
        })}
      </RoleSection>

      <RoleSection title="Vendors" count={vendors.length} statusFilter={statusFilter}>
        {vendors.map((user) => {
          const p = user.vendorProfile;
          return (
            <UserCard
              key={user.id}
              userId={user.id}
              phone={user.phone}
              status={user.status}
              role="VENDOR"
              name={p?.name}
              company={p?.company}
              email={p?.email ?? undefined}
              city={p?.city ?? undefined}
              gst={p?.gst ?? undefined}
            />
          );
        })}
      </RoleSection>
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </Link>
  );
}

function RoleSection({
  title,
  count,
  statusFilter,
  children,
}: {
  title: string;
  count: number;
  statusFilter?: UserStatus;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title} ({count})
      </h3>
      {count === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No {title.toLowerCase()}
          {statusFilter ? ` with status ${statusFilter}` : ""}.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">{children}</ul>
      )}
    </section>
  );
}

function UserCard({
  userId,
  phone,
  status,
  role,
  name,
  company,
  email,
  city,
  gst,
}: {
  userId: string;
  phone: string;
  status: UserStatus;
  role: "BUILDER" | "VENDOR";
  name?: string;
  company?: string;
  email?: string;
  city?: string;
  gst?: string;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{name ?? "—"}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
              {status}
            </span>
          </div>
          {company && (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{company}</span>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{phone}</span>
            {email && <span>{email}</span>}
            {city && <span>{city}</span>}
            {gst && <span>GST: {gst}</span>}
          </div>
        </div>
        {role === "VENDOR" && (
          <Link
            href={`/admin/users/${userId}`}
            className="shrink-0 text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            Manage categories →
          </Link>
        )}
      </div>
      <UserActions userId={userId} currentStatus={status} />
    </li>
  );
}
