"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { completeAward } from "@/server/actions/awards";

export function CompleteAwardButton({ awardId }: { awardId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    if (!confirm("Mark this award as COMPLETED? This confirms the deal is done.")) return;
    setError(null);
    startTransition(async () => {
      const result = await completeAward(awardId);
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Banner tone="error" title={error} />}
      <Button variant="secondary" onClick={handleComplete} disabled={isPending}>
        {isPending ? "Completing…" : "Mark Completed"}
      </Button>
    </div>
  );
}
