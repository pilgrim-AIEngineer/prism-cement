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
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold tracking-tight">New project</h1>
        <AccountStatusBanner status={user.status} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">New project</h1>
      <div className="max-w-md">
        <ProjectForm mode="create" />
      </div>
    </div>
  );
}
