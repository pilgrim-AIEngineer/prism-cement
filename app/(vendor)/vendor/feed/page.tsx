import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getVendorFeed } from "@/server/actions/requirements";
import { AccountStatusBanner } from "@/components/auth/AccountStatusBanner";
import { RequirementCard } from "@/components/vendor/RequirementCard";

export default async function VendorFeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const result = await getVendorFeed();

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold tracking-tight">Open Requirements</h1>
        <AccountStatusBanner
          status={result.error.includes("verified") ? "PENDING" : "VERIFIED"}
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{result.error}</p>
      </div>
    );
  }

  const requirements = result.data;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">Open Requirements</h1>

      {requirements.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No open requirements in your approved categories. Check back later or request approval for
          more categories.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {requirements.map((req) => (
            <RequirementCard key={req.id} requirement={req} />
          ))}
        </div>
      )}
    </div>
  );
}
