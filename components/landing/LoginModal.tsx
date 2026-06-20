"use client";

import { useState, useEffect, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { otpSchema, phoneSchema } from "@/lib/validation/auth";
import { login } from "@/server/actions/auth";

// Brand-native field styling. The shared TextField/Banner carry `dark:`
// variants that render near-black on this intentionally fixed-light cream
// tile, so the modal uses its own warm-themed inputs instead.
const fieldBase =
  "w-full rounded-xl border bg-white px-4 text-brand-text placeholder:text-brand-muted/40 " +
  "outline-none transition-colors focus:ring-4 focus:ring-brand-accent/15";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "phone" | "otp";

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [isPending, startTransition] = useTransition();
  // Countdown timer for OTP resend. The reset to 120 happens at the step
  // transition (handleRequestOtp), not here — calling setState synchronously in
  // an effect body triggers cascading renders.
  useEffect(() => {
    if (step !== "otp") return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (!isOpen) return;
    const id = step === "phone" ? "modal-phone" : "modal-otp";
    const timer = setTimeout(() => {
      (document.getElementById(id) as HTMLInputElement | null)?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen, step]);

  function handleClose() {
    setStep("phone");
    setPhone("");
    setOtp("");
    setError(null);
    onClose();
  }

  function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid phone number");
      return;
    }
    setPhone(parsed.data);
    setSecondsLeft(120);
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

  function handleResend() {
    setOtp("");
    setError(null);
    setStep("phone");
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-footer/40 backdrop-blur-sm px-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-brand-border bg-brand-card p-8 shadow-2xl ring-1 ring-brand-footer/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft accent glow at the top of the tile */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-brand-accent/10 blur-3xl"
        />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-brand-accent-soft hover:text-brand-text"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="relative mb-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-accent text-white shadow-lg shadow-brand-accent/25">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              {step === "phone" ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.25A2.25 2.25 0 015.25 3h2.04c.95 0 1.77.66 1.98 1.59l.66 2.9a2.04 2.04 0 01-.55 1.9l-1.2 1.2a14.5 14.5 0 006.34 6.34l1.2-1.2a2.04 2.04 0 011.9-.55l2.9.66c.93.21 1.59 1.03 1.59 1.98v2.04A2.25 2.25 0 0118.75 21H18C9.72 21 3 14.28 3 6v-.75z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-1.5 0h12a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5v-6a1.5 1.5 0 011.5-1.5z" />
              )}
            </svg>
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-accent">
            BuildCityBulk
          </p>
          <h2 id="modal-title" className="text-2xl font-bold tracking-tight text-brand-text">
            {step === "phone" ? "Sign in to your account" : "Enter your code"}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-brand-muted">
            {step === "phone"
              ? "Enter your phone number to receive a one-time code."
              : <>We sent a 6-digit code to <span className="font-semibold text-brand-text">{phone}</span>.</>}
          </p>
        </div>

        {/* Phone step */}
        {step === "phone" && (
          <form onSubmit={handleRequestOtp} className="relative flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-phone" className="text-sm font-medium text-brand-text">
                Phone number
              </label>
              <input
                id="modal-phone"
                type="tel"
                inputMode="tel"
                placeholder="+91 98765 43210"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={error ? true : undefined}
                className={`${fieldBase} py-3 text-base ${
                  error ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-brand-border focus:border-brand-accent"
                }`}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-xl bg-brand-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-accent/25 transition-colors hover:bg-brand-accent-h"
            >
              Send OTP
            </button>
          </form>
        )}

        {/* OTP step */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="relative flex flex-col gap-4" noValidate>
            <div className="flex items-start gap-3 rounded-xl border border-brand-border bg-brand-accent-soft/50 px-4 py-3">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.04-.02a.75.75 0 011.06.74l-.32 3.06a.75.75 0 001.06.74l.04-.02M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <p className="text-sm leading-relaxed text-brand-text">
                <span className="font-semibold">Mock OTP active.</span> No SMS is sent in this demo — enter{" "}
                <span className="font-mono font-semibold text-brand-accent">123456</span> to continue.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modal-otp" className="text-sm font-medium text-brand-text">
                One-time code
              </label>
              <input
                id="modal-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                aria-invalid={error ? true : undefined}
                className={`${fieldBase} py-3.5 text-center text-2xl font-semibold tracking-[0.5em] placeholder:tracking-[0.5em] ${
                  error ? "border-red-400 focus:border-red-400 focus:ring-red-200" : "border-brand-border focus:border-brand-accent"
                }`}
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center rounded-xl bg-brand-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-accent/25 transition-colors hover:bg-brand-accent-h disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Verifying…" : "Verify & continue"}
            </button>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-brand-muted transition-colors hover:text-brand-text"
              >
                Use a different number
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={secondsLeft > 0}
                className="text-sm font-medium text-brand-accent transition-colors disabled:cursor-not-allowed disabled:text-brand-muted"
              >
                {secondsLeft > 0 ? `Resend OTP (${secondsLeft}s)` : "Resend OTP"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
