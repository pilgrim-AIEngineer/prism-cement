"use client";

import { useState, useEffect, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { TextField } from "@/components/ui/TextField";
import { otpSchema, phoneSchema } from "@/lib/validation/auth";
import { login } from "@/server/actions/auth";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative bg-brand-card rounded-2xl shadow-2xl w-full max-w-sm p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-brand-muted hover:text-brand-text transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-accent mb-1">
            BuildCityBulk
          </p>
          <h2 id="modal-title" className="text-xl font-bold text-brand-text">
            {step === "phone" ? "Sign in to your account" : "Enter your OTP"}
          </h2>
          <p className="text-sm text-brand-muted mt-1">
            {step === "phone"
              ? "Enter your phone number to receive a one-time code."
              : `A code was sent to ${phone}.`}
          </p>
        </div>

        {/* Phone step */}
        {step === "phone" && (
          <form onSubmit={handleRequestOtp} className="flex flex-col gap-4" noValidate>
            <TextField
              id="modal-phone"
              label="Phone number"
              type="tel"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={error ?? undefined}
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-brand-accent text-white hover:bg-brand-accent-h transition-colors"
            >
              Send OTP
            </button>
          </form>
        )}

        {/* OTP step */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4" noValidate>
            <Banner tone="info" title="Mock OTP active">
              No SMS is sent in this demo. Enter{" "}
              <span className="font-mono font-semibold">123456</span> to continue.
            </Banner>

            <TextField
              id="modal-otp"
              label="One-time code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              error={error ?? undefined}
            />

            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold bg-brand-accent text-white hover:bg-brand-accent-h disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Verifying…" : "Verify & continue"}
            </button>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="text-sm text-brand-muted hover:text-brand-text transition-colors"
              >
                Use a different number
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={secondsLeft > 0}
                className="text-sm font-medium text-brand-accent disabled:text-brand-muted disabled:cursor-not-allowed transition-colors"
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
