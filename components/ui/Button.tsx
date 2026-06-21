import type { ButtonHTMLAttributes } from "react";

const VARIANT_CLASSES = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300",
  secondary:
    "border border-zinc-300 text-zinc-900 hover:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800",
  accent:
    "bg-brand-accent text-white hover:bg-brand-accent-h disabled:opacity-60 shadow-sm",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANT_CLASSES;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
