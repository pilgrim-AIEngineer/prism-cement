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
  const isBlocked = user.status === "SUSPENDED" || user.status === "REJECTED";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Builder dashboard</h1>
      <AccountStatusBanner status={user.status} />

      {!isBlocked && (
        <section className="flex flex-col gap-2 rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">Coming in later slices</p>
          <p>
            {user.status === "VERIFIED"
              ? "Create projects, add material requirements, and track their status here."
              : "Project and requirement creation unlock once Admin verifies your account."}
          </p>
        </section>
      )}
    </div>
  );
}
