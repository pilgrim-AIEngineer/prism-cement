import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAuditLogs } from "@/server/actions/audit";
import type { AuditLogEntry } from "@/server/actions/audit";

interface SearchParams {
  entity?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function AdminAuditPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const result = await getAuditLogs({
    entity: sp.entity || undefined,
    action: sp.action || undefined,
    dateFrom: sp.dateFrom || undefined,
    dateTo: sp.dateTo || undefined,
    page,
    pageSize: 25,
  });

  const hasFilters = !!(sp.entity || sp.action || sp.dateFrom || sp.dateTo);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Audit Log</h1>
        {result.ok && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {result.data.total} {result.data.total === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {/* Filters — native HTML form, no JS required */}
      <form
        method="GET"
        className="flex flex-wrap items-end gap-2"
        aria-label="Filter audit log"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-entity" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Entity
          </label>
          <input
            id="audit-entity"
            name="entity"
            defaultValue={sp.entity}
            placeholder="user, bid, requirement…"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-action" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Action
          </label>
          <input
            id="audit-action"
            name="action"
            defaultValue={sp.action}
            placeholder="VERIFY_USER, BID_SUBMITTED…"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-date-from" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            From
          </label>
          <input
            id="audit-date-from"
            type="date"
            name="dateFrom"
            defaultValue={sp.dateFrom}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="audit-date-to" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            To
          </label>
          <input
            id="audit-date-to"
            type="date"
            name="dateTo"
            defaultValue={sp.dateTo}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Filter
          </button>
          {hasFilters && (
            <Link
              href="/admin/audit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Log list */}
      {!result.ok ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {result.error}
        </p>
      ) : result.data.logs.length === 0 ? (
        <div className="rounded-md border border-zinc-200 p-8 text-center dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {hasFilters ? "No entries match the current filters." : "No audit entries yet."}
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {result.data.logs.map((log) => (
              <AuditRow key={log.id} log={log} />
            ))}
          </ul>

          {result.data.totalPages > 1 && (
            <Pagination
              page={result.data.page}
              totalPages={result.data.totalPages}
              sp={sp}
            />
          )}
        </>
      )}
    </div>
  );
}

function AuditRow({ log }: { log: AuditLogEntry }) {
  const actorLabel = log.actor
    ? `${log.actor.phone} (${log.actor.role})`
    : log.actorId
      ? `Unknown (${log.actorId.slice(0, 8)}…)`
      : "System";

  const hasDiff =
    (log.before !== null && log.before !== undefined) ||
    (log.after !== null && log.after !== undefined);

  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {log.action}
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {log.entity}
          </span>
          <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
            {log.entityId.slice(0, 8)}…
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <time
            dateTime={log.ts.toISOString()}
            className="text-xs text-zinc-500 dark:text-zinc-400"
          >
            {log.ts.toLocaleString()}
          </time>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">by {actorLabel}</span>
        </div>
      </div>

      {hasDiff && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {log.before !== null && log.before !== undefined && (
            <DiffBlock label="Before" value={log.before} variant="before" />
          )}
          {log.after !== null && log.after !== undefined && (
            <DiffBlock label="After" value={log.after} variant="after" />
          )}
        </div>
      )}
    </li>
  );
}

function DiffBlock({
  label,
  value,
  variant,
}: {
  label: string;
  value: unknown;
  variant: "before" | "after";
}) {
  const bg =
    variant === "before"
      ? "bg-red-50 border-red-100 dark:bg-red-950/20 dark:border-red-900/40"
      : "bg-green-50 border-green-100 dark:bg-green-950/20 dark:border-green-900/40";

  return (
    <div className={`rounded-md border p-2 ${bg}`}>
      <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  sp,
}: {
  page: number;
  totalPages: number;
  sp: SearchParams;
}) {
  function buildHref(p: number) {
    const params = new URLSearchParams();
    if (sp.entity) params.set("entity", sp.entity);
    if (sp.action) params.set("action", sp.action);
    if (sp.dateFrom) params.set("dateFrom", sp.dateFrom);
    if (sp.dateTo) params.set("dateTo", sp.dateTo);
    params.set("page", String(p));
    return `/admin/audit?${params.toString()}`;
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between text-sm"
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-zinc-500 dark:text-zinc-400">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
