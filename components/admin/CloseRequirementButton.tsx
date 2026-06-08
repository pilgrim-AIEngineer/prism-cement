"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeRequirement } from "@/server/actions/awards";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";

export function CloseRequirementButton({ requirementId }: { requirementId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (!confirm("Close this requirement without awarding? Vendors will no longer be able to bid."))
      return;

    setError(null);
    startTransition(async () => {
      const result = await closeRequirement({ requirementId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Banner tone="error" title={error} />}
      <Button variant="secondary" onClick={handleClose} disabled={isPending}>
        {isPending ? "Closing…" : "Close Requirement"}
      </Button>
    </div>
  );
}
