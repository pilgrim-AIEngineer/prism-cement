import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { uuidSchema } from "@/lib/validation/common";
import { UserActions } from "@/components/admin/UserActions";
import { VendorCategoryRow } from "@/components/admin/VendorCategoryRow";
import type { UserStatus } from "@prisma/client";

const STATUS_BADGE: Record<UserStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  VERIFIED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  SUSPENDED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
};

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { userId } = await params;

  if (!uuidSchema.safeParse(userId).success) notFound();

  const user = await db.user.findUnique({
    where: { id: userId, role: { not: "ADMIN" } },
    include: {
      builderProfile: true,
      vendorProfile: true,
      vendorCategories: {
        include: { category: true },
        orderBy: { category: { name: "asc" } },
      },
    },
  });

  if (!user) notFound();

  const profile = user.role === "BUILDER" ? user.builderProfile : user.vendorProfile;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        href="/admin/users"
        className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← Verification Queue
      </Link>

      <section className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {profile?.name ?? user.phone}
          </h2>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[user.status]}`}>
            {user.status}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {user.role}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Field label="Phone" value={user.phone} />
          {profile?.company && <Field label="Company" value={profile.company} />}
          {profile?.email && <Field label="Email" value={profile.email} />}
          {profile?.city && <Field label="City" value={profile.city} />}
          {user.vendorProfile?.gst && <Field label="GST" value={user.vendorProfile.gst} />}
          {user.vendorProfile?.pan && <Field label="PAN" value={user.vendorProfile.pan} />}
        </dl>

        <UserActions userId={user.id} currentStatus={user.status} />
      </section>

      {user.role === "VENDOR" && (
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Category approvals
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Vendor is operational in a category only when both the account is VERIFIED and the
            category is Approved.
          </p>
          {user.vendorCategories.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              This vendor has not requested any categories yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {user.vendorCategories.map((vc) => (
                <li key={vc.id}>
                  <VendorCategoryRow
                    vendorCategoryId={vc.id}
                    categoryName={vc.category.name}
                    verified={vc.verified}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}
