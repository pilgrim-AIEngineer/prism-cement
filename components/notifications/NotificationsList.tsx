import { MarkReadButton } from "./MarkReadButton";
import type { NotificationItem } from "@/server/actions/notifications";

const TYPE_LABELS: Record<string, string> = {
  NEW_BID: "New bid received",
  REQUIREMENT_AWARDED: "Requirement awarded",
  BID_SELECTED: "Bid selected",
  BID_NOT_SELECTED: "Bid not selected",
  USER_VERIFIED: "Account verified",
  CATEGORY_APPROVED: "Category approved",
  REQUIREMENT_COMPLETED: "Requirement completed",
  AWARD_COMPLETED: "Award completed",
};

function notificationSummary(type: string, payload: unknown): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  switch (type) {
    case "NEW_BID":
      return `New bid on ${p.anonCode ?? "a requirement"} from ${p.vendorName ?? "a vendor"} — ₹${p.amount ?? "?"}`;
    case "REQUIREMENT_AWARDED":
      return `A vendor was selected for ${p.anonCode ?? "your requirement"}. Our team will reach out shortly.`;
    case "BID_SELECTED":
      return `Your bid on ${p.anonCode ?? "a requirement"} (${p.category ?? ""}) was selected. Admin will contact you soon.`;
    case "BID_NOT_SELECTED":
      return `Your bid on ${p.anonCode ?? "a requirement"} (${p.category ?? ""}) was not selected this time.`;
    case "USER_VERIFIED":
      return "Your account has been verified. You can now use all features.";
    case "CATEGORY_APPROVED":
      return `You are now approved to bid in the ${p.categoryName ?? ""} category.`;
    case "REQUIREMENT_COMPLETED":
      return `Requirement ${p.anonCode ?? ""} has been marked completed.`;
    case "AWARD_COMPLETED":
      return `Your awarded bid on ${p.anonCode ?? "a requirement"} (${p.category ?? ""}) is now completed.`;
    default:
      return type.replace(/_/g, " ").toLowerCase();
  }
}

export function NotificationsList({ notifications }: { notifications: NotificationItem[] }) {
  if (notifications.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">No notifications yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {notifications.map((n) => (
        <li
          key={n.id}
          className={`flex items-start gap-3 rounded-md border p-3 ${
            n.readAt
              ? "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
          }`}
        >
          {/* Unread dot */}
          <div className="mt-1.5 shrink-0">
            {!n.readAt && (
              <span className="block h-2 w-2 rounded-full bg-blue-500" aria-hidden="true" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {TYPE_LABELS[n.type] ?? n.type}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {notificationSummary(n.type, n.payload)}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {new Date(n.createdAt).toLocaleString()}
            </p>
          </div>

          {!n.readAt && <MarkReadButton notificationId={n.id} />}
        </li>
      ))}
    </ul>
  );
}
