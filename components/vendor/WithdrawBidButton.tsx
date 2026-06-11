"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawBid } from "@/server/actions/bids";

export function WithdrawBidButton({ bidId }: { bidId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleWithdraw() {
    if (!confirm("Withdraw this bid? This cannot be undone while the requirement is open.")) return;
    startTransition(async () => {
      const result = await withdrawBid(bidId);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleWithdraw}
      disabled={isPending}
      className="w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-400"
    >
      {isPending ? "Withdrawing…" : "Withdraw bid"}
    </button>
  );
}
