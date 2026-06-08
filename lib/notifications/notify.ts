import { Prisma } from "@prisma/client";

// Write a notification row inside the same transaction as the triggering mutation.
// Payload must already be stripped of cross-party identity — see payloads.ts.
export async function notify(
  tx: Prisma.TransactionClient,
  userId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await tx.notification.create({ data: { userId, type, payload: payload as Prisma.InputJsonValue } });
}

// Finds all ADMIN users and notifies each one. Admin sees full detail — no stripping.
export async function notifyAdmins(
  tx: Prisma.TransactionClient,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const admins = await tx.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await Promise.all(admins.map((a) => notify(tx, a.id, type, payload)));
}
