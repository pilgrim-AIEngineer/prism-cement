"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead } from "@/server/actions/notifications";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await markNotificationRead(notificationId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-600 hover:underline disabled:cursor-not-allowed dark:text-zinc-500 dark:hover:text-zinc-300"
    >
      {isPending ? "…" : "Mark read"}
    </button>
  );
}
