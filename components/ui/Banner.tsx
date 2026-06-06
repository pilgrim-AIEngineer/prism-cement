import type { ReactNode } from "react";

const TONE_CLASSES = {
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
} as const;

interface BannerProps {
  tone?: keyof typeof TONE_CLASSES;
  title: string;
  children?: ReactNode;
}

// Used for status-gate messaging (awaiting verification / suspended) and
// inline form errors — the one "message box" shape this slice needs.
export function Banner({ tone = "info", title, children }: BannerProps) {
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${TONE_CLASSES[tone]}`} role="status">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm opacity-90">{children}</div>}
    </div>
  );
}
