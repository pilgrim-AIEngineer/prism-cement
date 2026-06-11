"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { selectVendorCategories } from "@/server/actions/users";
import type { ActionResult } from "@/server/types";

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
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Your categories
          </p>
          <div className="flex flex-col gap-2">
            {selected.map((vc) => (
              <div
                key={vc.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-3.5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {vc.category.name}
                </span>
                {vc.verified ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Approved
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    Pending approval
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {unselected.length > 0 && (
        <section>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {selected.length > 0 ? "Request more categories" : "Available categories"}
          </p>
          <div className="flex flex-col gap-2">
            {unselected.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-xl border border-dashed border-zinc-200 bg-white px-5 py-3.5 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{category.name}</span>
                <button
                  disabled={isPending}
                  onClick={() => requestCategory(category.id)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-brand-accent/30 hover:bg-brand-bg hover:text-brand-accent disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
                >
                  Request
                </button>
              </div>
            ))}
          </div>
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
