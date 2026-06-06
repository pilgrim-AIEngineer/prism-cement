import { redirect } from "next/navigation";
import { getSession, roleHomePath } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

// Role-scoped shell for /(admin)/** — ADMIN-only session gate and admin nav land here.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  // Middleware already keeps other roles out of /admin/**; redirect to the
  // caller's own home rather than /login so a signed-in user is never bounced
  // to the login screen by mistake.
  if (session.role !== "ADMIN") redirect(roleHomePath(session.role));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">BuildBid</span>
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
            Admin
          </span>
        </div>
        <SignOutButton />
      </header>
      <main className="flex flex-1 flex-col gap-6 p-6">{children}</main>
    </div>
  );
}
