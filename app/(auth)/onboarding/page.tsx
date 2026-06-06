import { redirect } from "next/navigation";
import { getPendingAuth } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const pending = await getPendingAuth();
  if (!pending) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Complete your profile</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{pending.phone}</span> is verified —
          tell us a bit about you to finish setting up your account.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
