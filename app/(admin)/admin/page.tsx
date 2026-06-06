import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({ where: { id: session.userId }, select: { phone: true } });
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Admin dashboard</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as <span className="font-medium text-zinc-900 dark:text-zinc-100">{user.phone}</span>. Admin
        accounts are seed-only and always verified — there is no status gate here.
      </p>
      <section className="flex flex-col gap-2 rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">Coming in later slices</p>
        <p>User &amp; vendor-category verification, dynamic form templates, bid review, and award brokering.</p>
      </section>
    </div>
  );
}
