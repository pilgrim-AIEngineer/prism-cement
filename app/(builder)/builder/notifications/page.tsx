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
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>
      <NotificationsList notifications={notifications} />
    </div>
  );
}
