import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { RequirementStatus } from "@prisma/client";

const STATUS_BADGE: Record<RequirementStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CLOSED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  AWARDED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  REOPENED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

export default async function AdminRequirementsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const requirements = await db.requirement.findMany({
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
  });

  const openCount = requirements.filter((r) => r.status === "OPEN").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Bid Review</h1>
        {openCount > 0 && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {openCount} open
          </span>
        )}
      </div>

      {requirements.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No requirements yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {requirements.map((req) => {
            const bp = req.project.builder.builderProfile;
            const builderLabel = bp
              ? `${bp.name} · ${bp.company}`
              : req.project.builder.phone;
            return (
              <li key={req.id}>
                <Link
                  href={`/admin/requirements/${req.id}`}
                  className="flex flex-col gap-1 rounded-md border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {req.anonCode}
                    </span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {req.category.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[req.status]}`}
                    >
                      {req.status}
                    </span>
                    {req._count.bids > 0 && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {req._count.bids} bid{req._count.bids !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {req.project.name} · {builderLabel}
                    {req.cityZone ? ` · ${req.cityZone}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
