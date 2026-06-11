"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBid } from "@/server/actions/bids";
import type { VendorBidView } from "@/lib/serializers";

export function BidForm({
  requirementId,
  existingBid,
}: {
  requirementId: string;
  existingBid: VendorBidView | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(existingBid?.amount ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isEditing = existingBid !== null && existingBid.status === "SUBMITTED";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await submitBid({ requirementId, amount });
      if (!result.ok) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
        {isEditing ? "Edit your bid" : "Place a bid"}
      </h2>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bid-amount" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Bid amount
        </label>
        <div className="flex items-center gap-0">
          <span className="flex h-10 items-center rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 px-3 text-sm font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            ₹
          </span>
          <input
            id="bid-amount"
            type="text"
            inputMode="decimal"
            placeholder="e.g. 50000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            disabled={isPending}
            className="h-10 flex-1 rounded-r-lg border border-zinc-300 px-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          Bid {isEditing ? "updated" : "submitted"} successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-brand-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent-h disabled:opacity-50"
      >
        {isPending ? "Saving…" : isEditing ? "Update bid" : "Submit bid"}
      </button>
    </form>
  );
}
