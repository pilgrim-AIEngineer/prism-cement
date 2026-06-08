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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {isEditing ? "Edit your bid" : "Place a bid"}
      </h2>

      <div className="flex flex-col gap-1">
        <label htmlFor="bid-amount" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Amount (₹)
        </label>
        <input
          id="bid-amount"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 50000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          disabled={isPending}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Bid {isEditing ? "updated" : "submitted"} successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isPending ? "Saving…" : isEditing ? "Update bid" : "Submit bid"}
      </button>
    </form>
  );
}
