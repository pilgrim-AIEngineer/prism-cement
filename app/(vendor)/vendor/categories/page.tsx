import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { AccountStatusBanner } from "@/components/auth/AccountStatusBanner";
import { CategorySelector } from "@/components/vendor/CategorySelector";
import { Banner } from "@/components/ui/Banner";

export default async function VendorCategoriesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { status: true },
  });
  if (!user) redirect("/login");

  const isBlocked = user.status === "SUSPENDED" || user.status === "REJECTED";

  const [allCategories, vendorCategories] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.vendorCategory.findMany({
      where: { vendorId: session.userId },
      select: {
        id: true,
        categoryId: true,
        verified: true,
        category: { select: { id: true, name: true } },
      },
    }),
  ]);

  const selectedIds = new Set(vendorCategories.map((vc) => vc.categoryId));
  const unselected = allCategories.filter((c) => !selectedIds.has(c.id));

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <h2 className="text-lg font-semibold tracking-tight">My Categories</h2>

      <AccountStatusBanner status={user.status} />

      {!isBlocked && (
        <>
          <Banner tone="info" title="How categories work">
            Request the categories you deal in. You can browse and bid on open requirements in
            categories where your account is <strong>Verified</strong> and the category is{" "}
            <strong>Approved</strong> by Admin — both conditions are required.
          </Banner>
          <CategorySelector unselected={unselected} selected={vendorCategories} />
        </>
      )}
    </div>
  );
}
