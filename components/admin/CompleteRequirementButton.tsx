"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { completeRequirement } from "@/server/actions/completion";

export function CompleteRequirementButton({ requirementId }: { requirementId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    <div className="flex flex-col gap-2">
      {error && <Banner tone="error" title={error} />}
      <Button onClick={handleClick} disabled={isPending}>
        {isPending ? "Completing…" : "Mark Completed"}
      </Button>
    </div>
  );
}
