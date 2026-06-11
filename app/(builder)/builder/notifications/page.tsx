import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getNotifications } from "@/server/actions/notifications";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { MarkAllReadButton } from "@/components/notifications/MarkAllReadButton";

export default async function BuilderNotificationsPage() {
  const session = await getSession();
  if (!session || session.role !== "BUILDER") redirect("/login");

  const result = await getNotifications();
  const notifications = result.ok ? result.data : [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
            Notifications
          </h1>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-zinc-400">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
            <MarkAllReadButton />
          </div>
        )}
      </div>

      <div className="max-w-2xl">
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <NotificationsList notifications={notifications} />
        </div>
      </div>
    </div>
  );
}
