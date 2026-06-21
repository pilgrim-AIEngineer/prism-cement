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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-brand-text">
        {label}
      </label>
      <input
        id={id}
        className={`rounded-xl border bg-white px-4 py-2.5 text-sm text-brand-text outline-none transition-colors placeholder:text-brand-muted/40 focus:border-brand-accent focus:ring-4 focus:ring-brand-accent/15 ${
          error ? "border-red-400" : "border-brand-border"
        } ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        {...props}
      />
      {messageId && (
        <p id={messageId} className={`text-xs ${error ? "text-red-600 font-medium" : "text-brand-muted"}`}>
          {error ?? helpText}
        </p>
      )}
    </div>
  );
}
