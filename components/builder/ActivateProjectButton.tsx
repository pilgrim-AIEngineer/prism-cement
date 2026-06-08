"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { activateProject } from "@/server/actions/projects";

export function ActivateProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await activateProject(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" onClick={handleClick} disabled={isPending}>
        {isPending ? "Activating…" : "Activate project"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
