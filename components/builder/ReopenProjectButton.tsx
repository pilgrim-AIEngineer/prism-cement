"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { reopenProject } from "@/server/actions/completion";

export function ReopenProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Reopen this project? It will return to ACTIVE status.")) return;
    setError(null);
    startTransition(async () => {
      const result = await reopenProject(projectId);
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" onClick={handleClick} disabled={isPending}>
        {isPending ? "Reopening…" : "Reopen project"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
