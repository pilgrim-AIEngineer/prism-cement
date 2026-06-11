"use server";

import { db } from "@/lib/db";
import {
  clearPendingAuth,
  createPendingAuth,
  createSession,
  destroySession,
  getPendingAuth,
  roleHomePath,
  verifyOtp,
} from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { completeOnboardingSchema, loginSchema, type CompleteOnboardingInput, type LoginInput } from "@/lib/validation/auth";
import type { ActionResult } from "@/server/types";
export type { ActionResult } from "@/server/types";

// Authentication bootstrap — deliberately NOT the standard domain-mutation
// pipeline (Zod -> RBAC -> ownership -> mutate -> audit) from
// .claude/rules/conventions.md, because there is no session yet to derive a
// role or an owner from. The equivalent gates here are:
//   - "RBAC"      -> verifyOtp() / a valid pending-auth cookie proves the
//                    caller controls the phone number being acted on.
//   - "ownership" -> the phone is always read from the signed pending-auth
//                    cookie, never from client input, so the account that gets
//                    created always belongs to the verified phone.
// Account creation still ends in writeAudit() (PRD: "writeAudit() on user +
// profile creation").

// ActionResult is now defined in @/server/types and re-exported above.

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function login(input: LoginInput): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Enter a valid phone number and OTP");
  }
  const { phone, otp } = parsed.data;

  const verified = await verifyOtp(phone, otp);
  if (!verified) {
    return fail("Incorrect OTP. Use the mock code to sign in.");
  }

  const user = await db.user.findUnique({ where: { phone } });

  if (user) {
    await createSession({ userId: user.id, role: user.role });
    return { ok: true, data: { redirectTo: roleHomePath(user.role) } };
  }

  // No account for this phone yet — stash a short-lived proof that the phone
  // passed verifyOtp so /onboarding can create the account without asking for
  // the OTP a second time.
  await createPendingAuth({ phone });
  return { ok: true, data: { redirectTo: "/onboarding" } };
}

export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<ActionResult<{ redirectTo: string }>> {
  const pending = await getPendingAuth();
  if (!pending) {
    return fail("Your verification has expired. Verify your phone again to continue.");
  }

  const parsed = completeOnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the form and try again");
  }
  const onboarding = parsed.data;

  // The `login` "user found" branch handles existing phones, so this should be
  // unreachable in the normal flow — guard it anyway in case a pending-auth
  // cookie outlives a concurrent sign-up for the same phone.
  const existingUser = await db.user.findUnique({ where: { phone: pending.phone } });
  if (existingUser) {
    await clearPendingAuth();
    return fail("An account already exists for this phone. Sign in instead.");
  }

  const user = await db.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { phone: pending.phone, role: onboarding.role, status: "PENDING" },
    });

    await writeAudit(tx, {
      actorId: createdUser.id,
      action: "CREATE_USER",
      entity: "user",
      entityId: createdUser.id,
      before: null,
      after: { phone: createdUser.phone, role: createdUser.role, status: createdUser.status },
    });

    if (onboarding.role === "BUILDER") {
      const profile = onboarding.profile;
      const builderProfile = await tx.builderProfile.create({
        data: {
          userId: createdUser.id,
          name: profile.name,
          company: profile.company,
          email: profile.email ?? null,
          city: profile.city ?? null,
        },
      });
      await writeAudit(tx, {
        actorId: createdUser.id,
        action: "CREATE_PROFILE",
        entity: "builder_profile",
        entityId: createdUser.id,
        before: null,
        after: {
          userId: builderProfile.userId,
          name: builderProfile.name,
          company: builderProfile.company,
          email: builderProfile.email,
          city: builderProfile.city,
        },
      });
    } else {
      const profile = onboarding.profile;
      const vendorProfile = await tx.vendorProfile.create({
        data: {
          userId: createdUser.id,
          name: profile.name,
          company: profile.company,
          email: profile.email ?? null,
          gst: profile.gst ?? null,
          pan: profile.pan ?? null,
          city: profile.city ?? null,
        },
      });
      await writeAudit(tx, {
        actorId: createdUser.id,
        action: "CREATE_PROFILE",
        entity: "vendor_profile",
        entityId: createdUser.id,
        before: null,
        after: {
          userId: vendorProfile.userId,
          name: vendorProfile.name,
          company: vendorProfile.company,
          email: vendorProfile.email,
          gst: vendorProfile.gst,
          pan: vendorProfile.pan,
          city: vendorProfile.city,
        },
      });
    }

    return createdUser;
  });

  await createSession({ userId: user.id, role: user.role });
  await clearPendingAuth();

  return { ok: true, data: { redirectTo: roleHomePath(user.role) } };
}

export async function logout(): Promise<ActionResult<{ redirectTo: string }>> {
  await destroySession();
  return { ok: true, data: { redirectTo: "/" } };
}
