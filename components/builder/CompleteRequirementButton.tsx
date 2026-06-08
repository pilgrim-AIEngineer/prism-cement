"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { completeRequirement } from "@/server/actions/completion";

export function CompleteRequirementButton({ requirementId }: { requirementId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Mark this requirement as COMPLETED?")) return;
    setError(null);
    startTransition(async () => {
      const result = await completeRequirement(requirementId);
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleClick} disabled={isPending}>
        {isPending ? "Completing…" : "Mark Completed"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
