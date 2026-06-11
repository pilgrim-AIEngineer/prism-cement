import Link from "next/link";
import type { VendorRequirementView } from "@/lib/serializers";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  REOPENED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  AWARDED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  COMPLETED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

interface RequirementCardProps {
  requirement: VendorRequirementView;
  hasBid?: boolean;
}

export function RequirementCard({ requirement, hasBid = false }: RequirementCardProps) {
  const statusStyle = STATUS_STYLES[requirement.status] ?? "bg-zinc-100 text-zinc-500";
  const preview = requirement.fields.slice(0, 3);

  return (
    <Link
      href={`/vendor/feed/${requirement.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {requirement.anonCode}
            </span>
            {hasBid && (
              <span className="rounded-full bg-brand-bg px-2 py-0.5 text-[10px] font-semibold text-brand-accent dark:bg-zinc-800 dark:text-brand-accent">
                Bid placed
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {requirement.category.name}
            {requirement.cityZone ? ` · ${requirement.cityZone}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
          {requirement.status}
        </span>
      </div>

      {preview.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          {preview.map((field) => (
            <span key={field.key} className="text-xs">
              <span className="text-zinc-400 dark:text-zinc-600">{field.label}: </span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {field.value !== undefined && field.value !== null ? String(field.value) : "—"}
              </span>
            </span>
          ))}
          {requirement.fields.length > 3 && (
            <span className="text-xs text-zinc-400 dark:text-zinc-600">
              +{requirement.fields.length - 3} more
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-end">
        <span className="text-xs font-medium text-brand-accent opacity-0 transition-opacity group-hover:opacity-100">
          View details →
        </span>
      </div>
    </Link>
  );
}
