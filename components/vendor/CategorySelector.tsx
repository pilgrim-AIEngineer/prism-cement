"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { selectVendorCategories } from "@/server/actions/users";
import type { ActionResult } from "@/server/actions/auth";

interface Category {
  id: string;
  name: string;
}

interface SelectedCategory {
  id: string;
  categoryId: string;
  verified: boolean;
  category: Category;
}

interface Props {
  unselected: Category[];
  selected: SelectedCategory[];
}

export function CategorySelector({ unselected, selected }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function requestCategory(categoryId: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result: ActionResult = await selectVendorCategories([categoryId]);
      if (!result.ok) {
        setError(result.error);
      } else {
        setSuccess("Category requested — awaiting admin approval.");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <Banner tone="error" title={error} />}
      {success && <Banner tone="info" title={success} />}

      {selected.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Your categories
          </h3>
          <ul className="flex flex-col gap-2">
            {selected.map((vc) => (
              <li
                key={vc.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3 dark:border-zinc-800"
              >
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {vc.category.name}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    vc.verified
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  }`}
                >
                  {vc.verified ? "Approved" : "Pending approval"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unselected.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {selected.length > 0 ? "Request more categories" : "Select your categories"}
          </h3>
          <ul className="flex flex-col gap-2">
            {unselected.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between rounded-md border border-dashed border-zinc-300 px-4 py-3 dark:border-zinc-700"
              >
                <span className="text-sm text-zinc-900 dark:text-zinc-100">{category.name}</span>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => requestCategory(category.id)}
                >
                  Request
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {unselected.length === 0 && selected.length > 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          You have requested all available categories.
        </p>
      )}

      {unselected.length === 0 && selected.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No active categories available.</p>
      )}
    </div>
  );
}
