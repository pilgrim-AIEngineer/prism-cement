import type { UserStatus } from "@prisma/client";
import { Banner } from "@/components/ui/Banner";

interface AccountStatusBannerProps {
  status: UserStatus;
}

interface StatusCopy {
  tone: "info" | "warning" | "error";
  title: string;
  body: string;
}

// VERIFIED -> null: full access, nothing to announce. Every other status is a
// gate the dashboard must visibly reflect (PRD §2 status gate).
const COPY: Record<UserStatus, StatusCopy | null> = {
  PENDING: {
    tone: "warning",
    title: "Awaiting verification",
    body: "Admin is reviewing your account. Your dashboard is read-only until you're verified — requirement and bid actions aren't available yet.",
  },
  SUSPENDED: {
    tone: "error",
    title: "Account suspended",
    body: "Contact Admin to get reinstated. No actions are available while your account is suspended.",
  },
  REJECTED: {
    tone: "error",
    title: "Account not approved",
    body: "Admin did not approve this account. Contact Admin if you believe this is a mistake.",
  },
  VERIFIED: null,
};

export function AccountStatusBanner({ status }: AccountStatusBannerProps) {
  const copy = COPY[status];
  if (!copy) return null;

  return (
    <Banner tone={copy.tone} title={copy.title}>
      {copy.body}
    </Banner>
  );
}
