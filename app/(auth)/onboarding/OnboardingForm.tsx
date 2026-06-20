"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { ZodIssue } from "zod";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import {
  builderProfileSchema,
  vendorProfileSchema,
  type CompleteOnboardingInput,
  type OnboardingRole,
} from "@/lib/validation/auth";
import { completeOnboarding } from "@/server/actions/auth";

type Step = "role" | "profile";

const ROLE_OPTIONS: ReadonlyArray<{ role: OnboardingRole; title: string; description: string }> = [
  {
    role: "BUILDER",
    title: "Builder",
    description: "Post material requirements for your projects and get connected to vendors through Admin.",
  },
  {
    role: "VENDOR",
    title: "Vendor",
    description: "Bid on material requirements in the categories you supply, once Admin approves you.",
  },
];

interface ProfileFormState {
  name: string;
  company: string;
  email: string;
  city: string;
  gst: string;
  pan: string;
}

const EMPTY_PROFILE: ProfileFormState = { name: "", company: "", email: "", city: "", gst: "", pan: "" };

type FieldErrors = Partial<Record<keyof ProfileFormState, string>>;

// Empty optional inputs must reach Zod as `undefined`, not `""` — otherwise
// `.optional()` fields get rejected by their min-length check.
function toOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

// Map Zod issues onto the specific field that produced each one so the user
// sees the error inline next to the offending input — not a single generic
// banner. The profile schemas are flat, so `path[0]` is the field key. Keep the
// first message per field (Zod reports the most relevant rule first).
function collectFieldErrors(issues: ReadonlyArray<ZodIssue>): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && key in EMPTY_PROFILE && !(key in errors)) {
      errors[key as keyof ProfileFormState] = issue.message;
    }
  }
  return errors;
}

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [profile, setProfile] = useState<ProfileFormState>(EMPTY_PROFILE);
  // Per-field validation errors render inline; `formError` is reserved for
  // errors that don't belong to a single field (server/session failures).
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function clearErrors() {
    setFieldErrors({});
    setFormError(null);
  }

  function handleSelectRole(selected: OnboardingRole) {
    clearErrors();
    setRole(selected);
    setStep("profile");
  }

  function handleBack() {
    clearErrors();
    setStep("role");
  }

  function updateField<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    // Clear this field's error as the user corrects it.
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function reportInvalid(issues: ReadonlyArray<ZodIssue>) {
    const errors = collectFieldErrors(issues);
    if (Object.keys(errors).length === 0) {
      // No issue mapped to a known field — fall back to a banner.
      setFormError(issues[0]?.message ?? "Check the form and try again");
      return;
    }
    setFieldErrors(errors);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearErrors();
    if (!role) return;

    const shared = {
      name: profile.name,
      company: profile.company,
      email: toOptional(profile.email),
      city: toOptional(profile.city),
    };

    // Branch per role so TS narrows `result` to one exact union member —
    // avoids casting through `CompleteOnboardingInput`.
    let input: CompleteOnboardingInput;
    if (role === "BUILDER") {
      const parsed = builderProfileSchema.safeParse(shared);
      if (!parsed.success) {
        reportInvalid(parsed.error.issues);
        return;
      }
      input = { role: "BUILDER", profile: parsed.data };
    } else {
      const parsed = vendorProfileSchema.safeParse({
        ...shared,
        gst: toOptional(profile.gst),
        pan: toOptional(profile.pan),
      });
      if (!parsed.success) {
        reportInvalid(parsed.error.issues);
        return;
      }
      input = { role: "VENDOR", profile: parsed.data };
    }

    startTransition(async () => {
      const result = await completeOnboarding(input);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      router.push(result.data.redirectTo);
    });
  }

  if (step === "role") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">I am a…</p>
        {ROLE_OPTIONS.map((option) => (
          <button
            key={option.role}
            type="button"
            onClick={() => handleSelectRole(option.role)}
            className="flex flex-col gap-1 rounded-md border border-zinc-300 px-4 py-3 text-left transition-colors hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-900"
          >
            <span className="font-medium">{option.title}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{option.description}</span>
          </button>
        ))}
      </div>
    );
  }

  const roleLabel = ROLE_OPTIONS.find((option) => option.role === role)?.title ?? "";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Setting up a <span className="font-medium text-zinc-900 dark:text-zinc-100">{roleLabel}</span> account.
      </p>
      {formError && <Banner tone="error" title={formError} />}
      <TextField
        id="name"
        label="Full name"
        autoComplete="name"
        value={profile.name}
        onChange={(event) => updateField("name", event.target.value)}
        error={fieldErrors.name}
        required
      />
      <TextField
        id="company"
        label="Company"
        autoComplete="organization"
        value={profile.company}
        onChange={(event) => updateField("company", event.target.value)}
        error={fieldErrors.company}
        required
      />
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        helpText="Optional"
        value={profile.email}
        onChange={(event) => updateField("email", event.target.value)}
        error={fieldErrors.email}
      />
      {role === "VENDOR" && (
        <>
          <TextField
            id="gst"
            label="GST number"
            helpText="Optional · e.g. 22AAAAA0000A1Z5"
            value={profile.gst}
            onChange={(event) => updateField("gst", event.target.value)}
            error={fieldErrors.gst}
          />
          <TextField
            id="pan"
            label="PAN"
            helpText="Optional · e.g. AAAAA0000A"
            value={profile.pan}
            onChange={(event) => updateField("pan", event.target.value)}
            error={fieldErrors.pan}
          />
        </>
      )}
      <TextField
        id="city"
        label="City"
        autoComplete="address-level2"
        helpText="Optional"
        value={profile.city}
        onChange={(event) => updateField("city", event.target.value)}
        error={fieldErrors.city}
      />
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          Back
        </button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating account…" : "Finish setup"}
        </Button>
      </div>
    </form>
  );
}
