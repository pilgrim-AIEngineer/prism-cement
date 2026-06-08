import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getVendorRequirement } from "@/server/actions/requirements";
import { getVendorBid } from "@/server/actions/bids";
import { BidForm } from "@/components/vendor/BidForm";
import { WithdrawBidButton } from "@/components/vendor/WithdrawBidButton";

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
      <div className="flex flex-col gap-4">
        <Link
          href="/vendor/feed"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Back to requirements
        </Link>
        <p className="text-sm text-red-600 dark:text-red-400">{reqResult.error}</p>
      </div>
    );
  }

  const req = reqResult.data;
  const existingBid = bidResult.ok ? bidResult.data : null;

  const STATUS_STYLES: Record<string, string> = {
    OPEN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    AWARDED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    COMPLETED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  const statusStyle = STATUS_STYLES[req.status] ?? "bg-zinc-100 text-zinc-600";

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Link
        href="/vendor/feed"
        className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to requirements
      </Link>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {req.anonCode}
          </h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}>
            {req.status}
          </span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {req.category.name}
          {req.cityZone ? ` · ${req.cityZone}` : ""}
        </p>
      </div>

      {req.fields.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Specification</h2>
          <dl className="divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {req.fields.map((field) => (
              <div key={field.key} className="flex gap-4 px-4 py-2.5">
                <dt className="w-40 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
                  {field.label}
                </dt>
                <dd className="text-sm text-zinc-900 dark:text-zinc-100">
                  {field.value !== undefined && field.value !== null
                    ? String(field.value)
                    : "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {existingBid && (
        <section className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Your current bid</h2>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            ₹{Number(existingBid.amount).toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Status:{" "}
            <span className="font-medium">{existingBid.status}</span>
          </p>
        </section>
      )}

      {req.status === "OPEN" && (
        <section className="flex flex-col gap-4">
          <BidForm requirementId={req.id} existingBid={existingBid} />
          {existingBid?.status === "SUBMITTED" && (
            <WithdrawBidButton bidId={existingBid.id} />
          )}
        </section>
      )}

      {req.status !== "OPEN" && !existingBid && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This requirement is no longer accepting bids.
        </p>
      )}
    </div>
  );
}
