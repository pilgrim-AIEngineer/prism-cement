"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { approveVendorCategory, revokeVendorCategory } from "@/server/actions/users";
import type { ActionResult } from "@/server/actions/auth";

interface Props {
  vendorCategoryId: string;
  categoryName: string;
  verified: boolean;
}

export function VendorCategoryRow({ vendorCategoryId, categoryName, verified }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function act(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{categoryName}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            verified
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
          }`}
        >
          {verified ? "Approved" : "Pending"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
        {verified ? (
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => act(() => revokeVendorCategory(vendorCategoryId))}
          >
            Revoke
          </Button>
        ) : (
          <Button
            variant="primary"
            disabled={isPending}
            onClick={() => act(() => approveVendorCategory(vendorCategoryId))}
          >
            Approve
          </Button>
        )}
      </div>
    </div>
  );
}
