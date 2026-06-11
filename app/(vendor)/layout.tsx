import { redirect } from "next/navigation";
import { getSession, roleHomePath } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/server/actions/notifications";
import { VendorShell } from "@/components/vendor/VendorShell";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "VENDOR") redirect(roleHomePath(session.role));

  const [user, vendorProfile, unreadNotifCount] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId }, select: { phone: true } }),
    db.vendorProfile.findUnique({ where: { userId: session.userId }, select: { name: true } }),
    getUnreadCount(),
  ]);

  if (!user) redirect("/login");

  return (
    <VendorShell
      vendorName={vendorProfile?.name ?? null}
      vendorPhone={user.phone}
      unreadNotifCount={unreadNotifCount}
    >
      {children}
    </VendorShell>
  );
}
