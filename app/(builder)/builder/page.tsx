import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AccountStatusBanner } from "@/components/auth/AccountStatusBanner";

export default async function BuilderDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.userId }, select: { status: true } });
  if (!user) redirect("/login");

  // Status is re-read from the DB on every render rather than cached in the
  // session — Admin can verify/suspend an account mid-session and the gate
  // must reflect that immediately (PRD §2 status gate).
  const isVerified = user.status === "VERIFIED";

  const projectCount = isVerified
    ? await db.project.count({ where: { builderId: session.userId } })
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Builder dashboard</h1>
      <AccountStatusBanner status={user.status} />

      {isVerified && (
        <nav className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DashCard
            href="/builder/projects"
            title="My projects"
            description="Create projects and add material requirements for each category."
            badge={projectCount > 0 ? `${projectCount} project${projectCount !== 1 ? "s" : ""}` : undefined}
          />
        </nav>
      )}
    </div>
  );
}

function DashCard({
  href,
  title,
  description,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1.5 rounded-md border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{title}</span>
        {badge && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
    </Link>
  );
}
