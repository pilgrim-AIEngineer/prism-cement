"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectBids } from "@/server/actions/awards";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";

export interface BidOption {
  id: string;
  vendorLabel: string;
  amount: string;
}

interface Props {
  requirementId: string;
  bids: BidOption[];
}

export function AwardBidsForm({ requirementId, bids }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (selected.size === 0) {
      setError("Select at least one bid to award");
      return;
    }
    if (
      !confirm(
        `Award ${selected.size} bid${selected.size !== 1 ? "s" : ""}? This will mark the requirement AWARDED and is not reversible from this form.`,
      )
    )
      return;

    setError(null);
    startTransition(async () => {
      const result = await selectBids({
        requirementId,
        bidIds: Array.from(selected),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (bids.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No SUBMITTED bids to select from.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Banner tone="error" title={error} />}
      <ul className="flex flex-col gap-2">
        {bids.map((bid) => (
          <li key={bid.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
              <input
                type="checkbox"
                checked={selected.has(bid.id)}
                onChange={() => toggle(bid.id)}
                disabled={isPending}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 accent-zinc-900 dark:border-zinc-600"
              />
              <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">
                {bid.vendorLabel}
              </span>
              <span className="font-mono text-sm font-medium text-zinc-700 dark:text-zinc-300">
                ₹{bid.amount}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={isPending || selected.size === 0}
      >
        {isPending
          ? "Awarding…"
          : selected.size === 0
            ? "Select bids to award"
            : `Award ${selected.size} bid${selected.size !== 1 ? "s" : ""}`}
      </Button>
    </div>
  );
}
