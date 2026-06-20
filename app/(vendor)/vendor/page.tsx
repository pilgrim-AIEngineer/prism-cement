import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { DashboardClient } from "./DashboardClient";

export default async function VendorDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      status: true,
      vendorProfile: {
        select: { company: true, name: true },
      },
      vendorCategories: {
        where: { verified: true },
        select: { categoryId: true },
      },
    },
  });
  if (!user) redirect("/login");

  const approvedCategoryIds = user.vendorCategories.map((vc) => vc.categoryId);
  const approvedCount = approvedCategoryIds.length;
  const isOperational = user.status === "VERIFIED" && approvedCount > 0;
  const isBlocked = user.status === "SUSPENDED" || user.status === "REJECTED";

  const [openReqsCount, activeBidsCount, recentOpportunities] = isOperational
    ? await Promise.all([
        db.requirement.count({
          where: { status: { in: ["OPEN", "REOPENED"] }, categoryId: { in: approvedCategoryIds } },
        }),
        db.bid.count({ where: { vendorId: session.userId, status: "SUBMITTED" } }),
        db.requirement.findMany({
          where: { status: { in: ["OPEN", "REOPENED"] }, categoryId: { in: approvedCategoryIds } },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { category: true }
        }),
      ])
    : [0, 0, []];

  return (
    <DashboardClient
      userStatus={user.status}
      companyName={user.vendorProfile?.company || user.vendorProfile?.name || "Vendor"}
      approvedCount={approvedCount}
      openReqsCount={openReqsCount}
      activeBidsCount={activeBidsCount}
      isOperational={isOperational}
      isBlocked={isBlocked}
      recentOpportunities={recentOpportunities}
    />
  );
}
