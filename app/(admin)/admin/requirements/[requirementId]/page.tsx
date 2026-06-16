import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uuidSchema } from "@/lib/validation/common";
import { formSchemaSnapshotSchema } from "@/lib/validation/formSchema";
import { adminRequirementBidView } from "@/lib/serializers/adminView";
import { AwardBidsForm } from "@/components/admin/AwardBidsForm";
import { BrokerAwardButton } from "@/components/admin/BrokerAwardButton";
import { CompleteAwardButton } from "@/components/admin/CompleteAwardButton";
import { CloseRequirementButton } from "@/components/admin/CloseRequirementButton";
import { CompleteRequirementButton } from "@/components/admin/CompleteRequirementButton";
import { ReopenRequirementButton } from "@/components/admin/ReopenRequirementButton";
import type { BidStatus, RequirementStatus, AwardStatus } from "@prisma/client";
import type { BidOption } from "@/components/admin/AwardBidsForm";

const STATUS_BADGE: Record<RequirementStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CLOSED: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300",
  AWARDED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  REOPENED: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const BID_STATUS_BADGE: Record<BidStatus, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  SELECTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  NOT_SELECTED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
  WITHDRAWN: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
};

const AWARD_STATUS_BADGE: Record<AwardStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  BROKERED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  CANCELLED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400",
};

interface Props {
  params: Promise<{ requirementId: string }>;
}

export default async function AdminRequirementDetailPage({ params }: Props) {
  const { requirementId } = await params;

  if (!uuidSchema.safeParse(requirementId).success) notFound();

  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const raw = await db.requirement.findUnique({
    where: { id: requirementId },
    select: {
      id: true,
      anonCode: true,
      status: true,
      cityZone: true,
      schemaSnapshot: true,
      formDataJson: true,
      createdAt: true,
      category: { select: { id: true, name: true, slug: true } },
      project: {
        select: {
          id: true,
          name: true,
          city: true,
          type: true,
          builder: {
            select: {
              id: true,
              phone: true,
              builderProfile: { select: { name: true, company: true } },
            },
          },
        },
      },
      bids: {
        select: {
          id: true,
          amount: true,
          fieldsJson: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          vendor: {
            select: {
              id: true,
              phone: true,
              vendorProfile: { select: { name: true, company: true, city: true } },
            },
          },
          award: { select: { id: true, status: true, brokeredAt: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!raw) notFound();

  const view = adminRequirementBidView(raw);

  const snapshotResult = formSchemaSnapshotSchema.safeParse(view.schemaSnapshot);
  const snapshot = snapshotResult.success ? snapshotResult.data : null;
  const formData = (view.formDataJson ?? {}) as Record<string, unknown>;

  // Bids selectable for award = SUBMITTED only
  const submittedBids: BidOption[] = view.bids
    .filter((b) => b.status === "SUBMITTED")
    .map((b) => ({
      id: b.id,
      vendorLabel: b.vendor.name
        ? `${b.vendor.name} · ${b.vendor.company ?? b.vendor.phone}`
        : b.vendor.phone,
      amount: b.amount,
    }));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/admin/requirements"
        className="text-sm text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        ← Bid Review
      </Link>

      {/* Header */}
      <section className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {view.anonCode}
          </span>
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {view.category.name}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[view.status]}`}
          >
            {view.status}
          </span>
        </div>
        {view.cityZone && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{view.cityZone}</p>
        )}

        {/* Admin-only identity section */}
        <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-950/30">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Admin only — not visible to vendor
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            <Field label="Project" value={view.project.name} />
            {view.project.city && <Field label="Project City" value={view.project.city} />}
            {view.project.type && <Field label="Type" value={view.project.type} />}
            <Field
              label="Builder"
              value={view.builder.name ?? view.builder.phone}
            />
            {view.builder.company && (
              <Field label="Company" value={view.builder.company} />
            )}
            <Field label="Builder Phone" value={view.builder.phone} />
          </dl>
        </div>
      </section>

      {/* Requirement form data */}
      {snapshot && snapshot.fields.filter((f) => f.type !== "section_header").length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Requirement details
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800 sm:grid-cols-3">
            {snapshot.fields
              .filter((f) => f.type !== "section_header")
              .map((field) => (
                <Field
                  key={field.key}
                  label={field.label + (field.unit ? ` (${field.unit})` : "")}
                  value={String(formData[field.key] ?? "—")}
                />
              ))}
          </dl>
        </section>
      )}

      {/* Bids */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Bids{" "}
          <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({view.bids.length} total
            {view.bids.filter((b) => b.status === "WITHDRAWN").length > 0
              ? `, ${view.bids.filter((b) => b.status === "WITHDRAWN").length} withdrawn`
              : ""}
            )
          </span>
        </h2>

        {view.bids.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No bids yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {view.bids.map((bid) => (
              <li
                key={bid.id}
                className={`rounded-md border p-4 ${
                  bid.status === "WITHDRAWN"
                    ? "border-zinc-200 opacity-60 dark:border-zinc-800"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {bid.vendor.name ?? bid.vendor.phone}
                    </span>
                    {bid.vendor.company && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {bid.vendor.company}
                        {bid.vendor.city ? ` · ${bid.vendor.city}` : ""}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {bid.vendor.phone}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      ₹{bid.amount}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${BID_STATUS_BADGE[bid.status]}`}
                    >
                      {bid.status}
                    </span>
                  </div>
                </div>

                {typeof bid.fieldsJson === "object" && bid.fieldsJson !== null && Object.keys(bid.fieldsJson).length > 0 && (
                  <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Additional fields
                    </p>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {Object.entries(bid.fieldsJson as Record<string, unknown>).map(
                        ([k, v]) => (
                          <div key={k} className="flex flex-col">
                            <dt className="text-zinc-400 dark:text-zinc-500">{k}</dt>
                            <dd className="text-zinc-700 dark:text-zinc-300">{String(v)}</dd>
                          </div>
                        ),
                      )}
                    </dl>
                  </div>
                )}

                {bid.award && (
                  <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Award:</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${AWARD_STATUS_BADGE[bid.award.status]}`}
                    >
                      {bid.award.status}
                    </span>
                    {bid.award.brokeredAt && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {new Date(bid.award.brokeredAt).toLocaleDateString()}
                      </span>
                    )}
                    {bid.award.status === "PENDING" && (
                      <BrokerAwardButton awardId={bid.award.id} />
                    )}
                    {bid.award.status === "BROKERED" && (
                      <CompleteAwardButton awardId={bid.award.id} />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Actions */}
      {(view.status === "OPEN" || view.status === "REOPENED") && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Award bids
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Select one or more SUBMITTED bids to connect. This moves the requirement to
              AWARDED and is audited.
            </p>
            <AwardBidsForm requirementId={view.id} bids={submittedBids} />
          </div>

          <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Close without awarding
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Close this requirement if no bids are suitable. Vendors will no longer be able
              to bid.
            </p>
            <CloseRequirementButton requirementId={view.id} />
          </div>
        </section>
      )}

      {(view.status === "AWARDED" || view.status === "CLOSED") && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Complete requirement
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Mark as COMPLETED once the procurement is fully done.
          </p>
          <CompleteRequirementButton requirementId={view.id} />
        </section>
      )}

      {view.status === "COMPLETED" && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Reopen requirement
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Reopen to REOPENED — vendors can bid again and admin can re-award.
          </p>
          <ReopenRequirementButton requirementId={view.id} />
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
