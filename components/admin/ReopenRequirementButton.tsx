"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { reopenRequirement } from "@/server/actions/completion";

export function ReopenRequirementButton({ requirementId }: { requirementId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Reopen this requirement? Vendors will be able to bid on it again.")) return;
    setError(null);
    startTransition(async () => {
      const result = await reopenRequirement(requirementId);
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Banner tone="error" title={error} />}
      <Button variant="secondary" onClick={handleClick} disabled={isPending}>
        {isPending ? "Reopening…" : "Reopen"}
      </Button>
    </div>
  );
}
