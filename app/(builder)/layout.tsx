import { redirect } from "next/navigation";
import { getSession, roleHomePath } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

// Role-scoped shell for /(builder)/** — session + role gate and builder nav
// land here. The VERIFIED status gate is rendered per-page (see app/(builder)/builder/page.tsx)
// since PENDING builders still reach a (read-only) dashboard — PRD §2.
export default async function BuilderLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "BUILDER") redirect(roleHomePath(session.role));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">BuildBid</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
            Builder
          </span>
        </div>
        <SignOutButton />
      </header>
      <main className="flex flex-1 flex-col gap-6 p-6">{children}</main>
    </div>
  );
}
