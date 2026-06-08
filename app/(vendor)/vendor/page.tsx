import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AccountStatusBanner } from "@/components/auth/AccountStatusBanner";

export default async function VendorDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      status: true,
      vendorCategories: { select: { verified: true } },
    },
  });
  if (!user) redirect("/login");

  // Status is re-read from the DB on every render rather than cached in the
  // session — Admin can verify/suspend an account mid-session and the gate
  // must reflect that immediately (PRD §2 status gate).
  const isBlocked = user.status === "SUSPENDED" || user.status === "REJECTED";
  const approvedCount = user.vendorCategories.filter((vc) => vc.verified).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Vendor dashboard</h1>
      <AccountStatusBanner status={user.status} />

      {!isBlocked && (
        <>
          <nav className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/vendor/categories"
              className="flex flex-col gap-1.5 rounded-md border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">My Categories</span>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {approvedCount > 0
                  ? `${approvedCount} approved categor${approvedCount === 1 ? "y" : "ies"} — request more or view status.`
                  : user.status === "VERIFIED"
                    ? "Select the categories you deal in to start receiving requirements."
                    : "Request categories now — they activate once your account is verified."}
              </p>
            </Link>

            <Link
              href="/vendor/feed"
              className="flex flex-col gap-1.5 rounded-md border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Browse Requirements</span>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {user.status === "VERIFIED" && approvedCount > 0
                  ? "View open requirements in your approved categories and place bids."
                  : "Unlocks once your account is verified and at least one category is approved."}
              </p>
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
