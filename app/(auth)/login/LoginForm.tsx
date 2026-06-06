"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { otpSchema, phoneSchema } from "@/lib/validation/auth";
import { login } from "@/server/actions/auth";

type Step = "phone" | "otp";

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
        <TextField
          id="phone"
          label="Phone number"
          type="tel"
          placeholder="+91 98765 43210"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit">Send OTP</Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4" noValidate>
      <Banner tone="info" title={`Code sent to ${phone}`}>
        MVP mock — no SMS is sent. Enter <span className="font-mono font-semibold">123456</span> to continue.
      </Banner>
      <TextField
        id="otp"
        label="One-time code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        value={otp}
        onChange={(event) => setOtp(event.target.value)}
        error={error ?? undefined}
      />
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleChangePhone}
          className="text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          Use a different number
        </button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Verifying…" : "Verify & continue"}
        </Button>
      </div>
    </form>
  );
}
