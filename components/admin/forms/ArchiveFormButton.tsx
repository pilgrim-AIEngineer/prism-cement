"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { archiveFormTemplate } from "@/server/actions/forms";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";

export function ArchiveFormButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    if (
      !confirm(
        "Archive this form template? The category will have no live form until a new version is created.",
      )
    )
      return;

    setError(null);
    startTransition(async () => {
      const result = await archiveFormTemplate(templateId);
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
      <Button variant="secondary" onClick={handleArchive} disabled={isPending}>
        {isPending ? "Archiving…" : "Archive"}
      </Button>
    </div>
  );
}
