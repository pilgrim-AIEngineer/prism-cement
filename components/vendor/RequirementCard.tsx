import Link from "next/link";
import type { VendorRequirementView } from "@/lib/serializers";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  AWARDED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  COMPLETED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function RequirementCard({ requirement }: { requirement: VendorRequirementView }) {
  const statusStyle = STATUS_STYLES[requirement.status] ?? "bg-zinc-100 text-zinc-600";

  return (
    <Link
      href={`/vendor/feed/${requirement.id}`}
      className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {requirement.anonCode}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
          {requirement.status}
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <span>{requirement.category.name}</span>
        {requirement.cityZone && (
          <>
            <span aria-hidden>·</span>
            <span>{requirement.cityZone}</span>
          </>
        )}
      </div>
      {requirement.fields.length > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          {requirement.fields.length} field{requirement.fields.length !== 1 ? "s" : ""}
        </p>
      )}
    </Link>
  );
}
