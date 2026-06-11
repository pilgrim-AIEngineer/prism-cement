"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { UserStatus } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { verifyUser, rejectUser, suspendUser, reinstateUser } from "@/server/actions/users";
import type { ActionResult } from "@/server/types";

interface Props {
  userId: string;
  currentStatus: UserStatus;
}

export function UserActions({ userId, currentStatus }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function act(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <Banner tone="error" title={error} />}
      <div className="flex flex-wrap gap-2">
        {currentStatus === "PENDING" && (
          <>
            <Button
              variant="primary"
              disabled={isPending}
              onClick={() => act(() => verifyUser(userId))}
            >
              Verify
            </Button>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => act(() => rejectUser(userId))}
            >
              Reject
            </Button>
          </>
        )}
        {currentStatus === "VERIFIED" && (
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => act(() => suspendUser(userId))}
          >
            Suspend
          </Button>
        )}
        {currentStatus === "SUSPENDED" && (
          <Button
            variant="primary"
            disabled={isPending}
            onClick={() => act(() => reinstateUser(userId))}
          >
            Reinstate
          </Button>
        )}
        {currentStatus === "REJECTED" && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">No further actions</span>
        )}
      </div>
    </div>
  );
}
