"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { publishRequirement } from "@/server/actions/requirements";

export function PublishRequirementButton({ requirementId }: { requirementId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await publishRequirement(requirementId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleClick} disabled={isPending}>
        {isPending ? "Publishing…" : "Publish requirement"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
