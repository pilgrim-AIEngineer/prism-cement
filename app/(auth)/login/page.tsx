import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-7">
      {/* Header with icon */}
      <div className="flex flex-col gap-3">
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-accent text-white shadow-lg shadow-brand-accent/25">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.25A2.25 2.25 0 015.25 3h2.04c.95 0 1.77.66 1.98 1.59l.66 2.9a2.04 2.04 0 01-.55 1.9l-1.2 1.2a14.5 14.5 0 006.34 6.34l1.2-1.2a2.04 2.04 0 011.9-.55l2.9.66c.93.21 1.59 1.03 1.59 1.98v2.04A2.25 2.25 0 0118.75 21H18C9.72 21 3 14.28 3 6v-.75z" />
          </svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-accent">
          BuildCityBulk
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-brand-text">
          Sign in to your account
        </h1>
        <p className="text-sm leading-relaxed text-brand-muted">
          Enter your phone number — we&apos;ll send a one-time code to verify it.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
