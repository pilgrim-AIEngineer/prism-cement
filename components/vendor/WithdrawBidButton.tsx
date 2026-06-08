"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawBid } from "@/server/actions/bids";

export function WithdrawBidButton({ bidId }: { bidId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleWithdraw() {
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
      className="self-start rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
    >
      {isPending ? "Withdrawing…" : "Withdraw bid"}
    </button>
  );
}
