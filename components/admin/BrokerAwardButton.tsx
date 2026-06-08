"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { brokerAward } from "@/server/actions/awards";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";

export function BrokerAwardButton({ awardId }: { awardId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBroker() {
    if (!confirm("Mark this award as BROKERED? This confirms you have contacted both parties offline."))
      return;

    setError(null);
    startTransition(async () => {
      const result = await brokerAward({ awardId });
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
      <Button variant="secondary" onClick={handleBroker} disabled={isPending}>
        {isPending ? "Marking…" : "Mark Brokered"}
      </Button>
    </div>
  );
}
