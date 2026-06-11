import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getVendorBids } from "@/server/actions/bids";

const BID_STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  SELECTED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  NOT_SELECTED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  WITHDRAWN: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const BID_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  SELECTED: "Selected",
  NOT_SELECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
  COMPLETED: "Completed",
};

export default async function VendorBidsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const result = await getVendorBids();

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">My Bids</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">All bids you have placed</p>
      </div>

      {!result.ok ? (
        <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
      ) : result.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No bids yet</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Browse open requirements and place your first bid.
          </p>
          <Link
            href="/vendor/feed"
            className="mt-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-accent-h"
          >
            Browse Requirements
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {result.data.length} bid{result.data.length === 1 ? "" : "s"} total
          </p>
          <div className="flex flex-col gap-2">
            {result.data.map((bid) => (
              <Link
                key={bid.id}
                href={`/vendor/feed/${bid.requirement.id}`}
                className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-5 py-4 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {bid.requirement.anonCode}
                    </span>
                    <span className="text-xs text-zinc-400">·</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {bid.requirement.category.name}
                    </span>
                    {bid.requirement.cityZone && (
                      <>
                        <span className="text-xs text-zinc-400">·</span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {bid.requirement.cityZone}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    Placed{" "}
                    {new Date(bid.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {bid.createdAt.getTime() !== bid.updatedAt.getTime() && (
                      <>
                        {" · updated "}
                        {new Date(bid.updatedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    ₹{Number(bid.amount).toLocaleString("en-IN")}
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      BID_STATUS_STYLES[bid.status] ?? "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {BID_STATUS_LABELS[bid.status] ?? bid.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
