import { redirect } from "next/navigation";
import { getSession, roleHomePath } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUnreadCount } from "@/server/actions/notifications";
import { BuilderShell } from "@/components/builder/BuilderShell";

export default async function BuilderLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "BUILDER") redirect(roleHomePath(session.role));

  const [user, builderProfile, unreadNotifCount] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId }, select: { phone: true } }),
    db.builderProfile.findUnique({ where: { userId: session.userId }, select: { name: true } }),
    getUnreadCount(),
  ]);

  if (!user) redirect("/login");

  return (
    <BuilderShell
      builderName={builderProfile?.name ?? null}
      builderPhone={user.phone}
      unreadNotifCount={unreadNotifCount}
    >
      {children}
    </BuilderShell>
  );
}
