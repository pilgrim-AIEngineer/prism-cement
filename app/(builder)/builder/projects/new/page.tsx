import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AccountStatusBanner } from "@/components/auth/AccountStatusBanner";
import { ProjectForm } from "@/components/builder/ProjectForm";

export default async function NewProjectPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (!user) redirect("/login");

  if (user.status !== "VERIFIED") {
    return (
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
          New project
        </h1>
        <AccountStatusBanner status={user.status} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link
          href="/builder/projects"
          className="text-stone-500 transition-colors hover:text-brand-accent dark:text-zinc-400"
        >
          Projects
        </Link>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-stone-400">
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="font-medium text-stone-900 dark:text-zinc-100">New project</span>
      </nav>

      <div className="max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100">
            Create a new project
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
            Add your project details. You can add material requirements once the project is created.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <ProjectForm mode="create" />
        </div>
      </div>
    </div>
  );
}
