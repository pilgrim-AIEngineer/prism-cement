import { redirect } from "next/navigation";
import { getSession, roleHomePath } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/server/actions/notifications";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect(roleHomePath(session.role));

  const [user, pendingCount, openRequirementsCount, unreadNotifCount] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId }, select: { phone: true } }),
    db.user.count({ where: { role: { not: "ADMIN" }, status: "PENDING" } }),
    db.requirement.count({ where: { status: "OPEN" } }),
    getUnreadCount(),
  ]);

  if (!user) redirect("/login");

  return (
    <AdminShell
      adminPhone={user.phone}
      pendingCount={pendingCount}
      openRequirementsCount={openRequirementsCount}
      unreadNotifCount={unreadNotifCount}
    >
      {children}
    </AdminShell>
  );
}
