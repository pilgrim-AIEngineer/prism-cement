import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getVendorFeed } from "@/server/actions/requirements";
import { getVendorBids } from "@/server/actions/bids";
import { AccountStatusBanner } from "@/components/auth/AccountStatusBanner";
import { RequirementCard } from "@/components/vendor/RequirementCard";

export default async function VendorFeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [feedResult, bidsResult] = await Promise.all([
    getVendorFeed(),
    getVendorBids(),
  ]);

  if (!feedResult.ok) {
    return (
      <div className="flex flex-col gap-6 p-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Requirements
          </h1>
        </div>
        <AccountStatusBanner
          status={feedResult.error.includes("verified") ? "PENDING" : "VERIFIED"}
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{feedResult.error}</p>
      </div>
    );
  }

  const requirements = feedResult.data;
  const biddedIds = bidsResult.ok
    ? new Set(bidsResult.data.filter((b) => b.status !== "WITHDRAWN").map((b) => b.requirement.id))
    : new Set<string>();

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Requirements
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Open requirements in your approved categories
          </p>
        </div>
        {requirements.length > 0 && (
          <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {requirements.length} open
          </span>
        )}
      </div>

      {requirements.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            No open requirements
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Nothing available in your approved categories right now. Check back later or request
            approval for more categories.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requirements.map((req) => (
            <RequirementCard
              key={req.id}
              requirement={req}
              hasBid={biddedIds.has(req.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
