import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getVendorRequirement } from "@/server/actions/requirements";
import { getVendorBid } from "@/server/actions/bids";
import { BidForm } from "@/components/vendor/BidForm";
import { WithdrawBidButton } from "@/components/vendor/WithdrawBidButton";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REOPENED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  AWARDED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  COMPLETED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const BID_STATUS_STYLES: Record<string, string> = {
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
  SELECTED: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
  NOT_SELECTED: "bg-zinc-50 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  WITHDRAWN: "bg-zinc-50 text-zinc-400 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700",
  COMPLETED: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
};

const BID_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted",
  SELECTED: "Selected by Admin",
  NOT_SELECTED: "Not selected",
  WITHDRAWN: "Withdrawn",
  COMPLETED: "Completed",
};

export default async function RequirementDetailPage({
  params,
}: {
  params: Promise<{ requirementId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { requirementId } = await params;

  const [reqResult, bidResult] = await Promise.all([
    getVendorRequirement(requirementId),
    getVendorBid(requirementId),
  ]);

  if (!reqResult.ok) {
    return (
      <div className="flex flex-col gap-4 p-6 lg:p-8">
        <Link
          href="/vendor/feed"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to requirements
        </Link>
        <p className="text-sm text-red-600 dark:text-red-400">{reqResult.error}</p>
      </div>
    );
  }

  const req = reqResult.data;
  const existingBid = bidResult.ok ? bidResult.data : null;
  const statusStyle = STATUS_STYLES[req.status] ?? "bg-zinc-100 text-zinc-500";
  const canBid = req.status === "OPEN" || req.status === "REOPENED";

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      <Link
        href="/vendor/feed"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to requirements
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {req.anonCode}
            </h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>
              {req.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {req.category.name}
            {req.cityZone && <> · {req.cityZone}</>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left: specification */}
        <div className="lg:col-span-3">
          {req.fields.length > 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Specification
                </h2>
              </div>
              <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {req.fields.map((field) => (
                  <div key={field.key} className="flex gap-6 px-5 py-3">
                    <dt className="w-36 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                      {field.label}
                    </dt>
                    <dd className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {field.value !== undefined && field.value !== null ? String(field.value) : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 px-5 py-8 text-center dark:border-zinc-800">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">No specification fields</p>
            </div>
          )}
        </div>

        {/* Right: bid section */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {existingBid && existingBid.status !== "WITHDRAWN" && (
            <div
              className={`rounded-xl border p-5 ${
                BID_STATUS_STYLES[existingBid.status] ?? "border-zinc-200 bg-white"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Your bid</p>
              <p className="mt-2 text-3xl font-bold">
                ₹{Number(existingBid.amount).toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs font-medium">
                {BID_STATUS_LABELS[existingBid.status] ?? existingBid.status}
              </p>
            </div>
          )}

          {canBid && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <BidForm requirementId={req.id} existingBid={existingBid} />
              {existingBid?.status === "SUBMITTED" && (
                <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <WithdrawBidButton bidId={existingBid.id} />
                </div>
              )}
            </div>
          )}

          {!canBid && !existingBid && (
            <div className="rounded-xl border border-dashed border-zinc-200 px-5 py-8 text-center dark:border-zinc-800">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                This requirement is no longer accepting bids.
              </p>
            </div>
          )}

          {!canBid && existingBid && existingBid.status === "WITHDRAWN" && (
            <div className="rounded-xl border border-dashed border-zinc-200 px-5 py-6 text-center dark:border-zinc-800">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                Bid withdrawn — requirement is no longer open.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
