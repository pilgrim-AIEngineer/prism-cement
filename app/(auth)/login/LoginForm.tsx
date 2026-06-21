"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { otpSchema, phoneSchema } from "@/lib/validation/auth";
import { login } from "@/server/actions/auth";

type Step = "phone" | "otp";

// Brand-native field styling matching the LoginModal aesthetic — warm cream
// palette, no dark-mode zinc.
const fieldBase =
  "w-full rounded-xl border bg-white px-4 text-brand-text placeholder:text-brand-muted/40 " +
  "outline-none transition-colors focus:ring-4 focus:ring-brand-accent/15";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid phone number");
      return;
    }

    // MVP: "request OTP" sends nothing — no SMS provider — so this step just
    // advances the UI to the verify step (PRD §3, §8).
    setPhone(parsed.data);
    setStep("otp");
  }

  function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = otpSchema.safeParse(otp);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter the 6-digit code");
      return;
    }

    startTransition(async () => {
      const result = await login({ phone, otp: parsed.data });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.data.redirectTo);
    });
  }

  function handleChangePhone() {
    setError(null);
    setOtp("");
    setStep("phone");
  }

  if (step === "phone") {
    return (
      <form onSubmit={handleRequestOtp} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-brand-text">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            placeholder="+91 98765 43210"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={error ? true : undefined}
            className={`${fieldBase} py-3 text-base ${
              error ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-brand-border focus:border-brand-accent"
            }`}
          />
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center rounded-xl bg-brand-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-accent/25 transition-all hover:-translate-y-0.5 hover:bg-brand-accent-h active:translate-y-0"
        >
          Send OTP
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4" noValidate>
      {/* Info banner — brand-styled */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-border bg-brand-accent-soft/50 px-4 py-3">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.04-.02a.75.75 0 011.06.74l-.32 3.06a.75.75 0 001.06.74l.04-.02M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <p className="text-sm leading-relaxed text-brand-text">
          <span className="font-semibold">Code sent to {phone}.</span>{" "}
          MVP mock — enter{" "}
          <span className="font-mono font-semibold text-brand-accent">123456</span> to continue.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="otp" className="text-sm font-medium text-brand-text">
          One-time code
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          aria-invalid={error ? true : undefined}
          className={`${fieldBase} py-3.5 text-center text-2xl font-semibold tracking-[0.5em] placeholder:tracking-[0.5em] ${
            error ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-brand-border focus:border-brand-accent"
          }`}
        />
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center rounded-xl bg-brand-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-accent/25 transition-all hover:-translate-y-0.5 hover:bg-brand-accent-h active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {isPending ? "Verifying…" : "Verify & continue"}
      </button>

      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={handleChangePhone}
          className="text-sm text-brand-muted transition-colors hover:text-brand-text"
        >
          Use a different number
        </button>
      </div>
    </form>
  );
}
