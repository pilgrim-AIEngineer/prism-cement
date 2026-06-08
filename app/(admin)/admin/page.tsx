import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, pendingCount, formCategoryCount, openBidCount] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId }, select: { phone: true } }),
    db.user.count({ where: { role: { not: "ADMIN" }, status: "PENDING" } }),
    db.formTemplate.count({ where: { status: "ACTIVE" } }),
    db.requirement.count({ where: { status: "OPEN" } }),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Admin dashboard</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Signed in as{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{user.phone}</span>.
      </p>

      <nav className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DashCard
          href="/admin/users"
          title="Verification Queue"
          description="Review and verify builders and vendors. Approve vendor categories."
          badge={pendingCount > 0 ? `${pendingCount} pending` : undefined}
        />
        <DashCard
          href="/admin/users?status=VERIFIED"
          title="Verified Users"
          description="View all verified builders and vendors."
        />
        <DashCard
          href="/admin/forms"
          title="Form Templates"
          description="Build and manage dynamic material requirement forms per category."
          badge={formCategoryCount > 0 ? `${formCategoryCount} active` : undefined}
        />
        <DashCard
          href="/admin/requirements"
          title="Bid Review"
          description="View all bids for each requirement. Select vendors to connect and broker deals offline."
          badge={openBidCount > 0 ? `${openBidCount} open` : undefined}
        />
      </nav>
    </div>
  );
}

function DashCard({
  href,
  title,
  description,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1.5 rounded-md border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">{title}</span>
        {badge && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
    </Link>
  );
}
