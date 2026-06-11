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
      vendorCategories: {
        where: { verified: true },
        select: { categoryId: true },
      },
    },
  });
  if (!user) redirect("/login");

  const approvedCategoryIds = user.vendorCategories.map((vc) => vc.categoryId);
  const approvedCount = approvedCategoryIds.length;
  const isOperational = user.status === "VERIFIED" && approvedCount > 0;
  const isBlocked = user.status === "SUSPENDED" || user.status === "REJECTED";

  const [openReqsCount, activeBidsCount] = isOperational
    ? await Promise.all([
        db.requirement.count({
          where: { status: { in: ["OPEN", "REOPENED"] }, categoryId: { in: approvedCategoryIds } },
        }),
        db.bid.count({ where: { vendorId: session.userId, status: "SUBMITTED" } }),
      ])
    : [0, 0];

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Your vendor overview</p>
      </div>

      <AccountStatusBanner status={user.status} />

      {!isBlocked && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Approved Categories"
              value={approvedCount}
              hint={approvedCount === 0 ? "None yet — request from Categories" : undefined}
            />
            <StatCard
              label="Open Requirements"
              value={openReqsCount}
              hint={!isOperational ? "Unlocks when verified + approved" : undefined}
            />
            <StatCard
              label="Active Bids"
              value={activeBidsCount}
              hint={!isOperational ? "Unlocks when verified + approved" : undefined}
            />
          </div>

          <section>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Quick actions
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <QuickLink
                href="/vendor/feed"
                title="Browse Requirements"
                description={
                  isOperational
                    ? `${openReqsCount} open in your categories`
                    : "Verify account + get category approval first"
                }
              />
              <QuickLink
                href="/vendor/bids"
                title="My Bids"
                description={
                  activeBidsCount > 0
                    ? `${activeBidsCount} active bid${activeBidsCount === 1 ? "" : "s"}`
                    : "Track all your bids here"
                }
              />
              <QuickLink
                href="/vendor/categories"
                title="Categories"
                description={
                  approvedCount > 0
                    ? `${approvedCount} approved — view or request more`
                    : "Request categories to start bidding"
                }
              />
              <QuickLink
                href="/vendor/notifications"
                title="Notifications"
                description="Stay updated on your bids and account status"
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>}
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-brand-border hover:bg-brand-bg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900 transition-colors group-hover:text-brand-accent dark:text-zinc-100">
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-3 h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-brand-accent dark:text-zinc-600"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </Link>
  );
}
