import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
  helpText?: string;
}

// `id` is required (rather than generated via useId) so this stays a plain
// function component usable from both Server and Client Components.
export function TextField({ label, id, error, helpText, className = "", ...props }: TextFieldProps) {
  const messageId = error ?? helpText ? `${id}-message` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        id={id}
        className={`rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:bg-zinc-900 ${
          error ? "border-red-400" : "border-zinc-300 dark:border-zinc-700"
        } ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        {...props}
      />
      {messageId && (
        <p id={messageId} className={`text-xs ${error ? "text-red-600" : "text-zinc-500"}`}>
          {error ?? helpText}
        </p>
      )}
    </div>
  );
}
