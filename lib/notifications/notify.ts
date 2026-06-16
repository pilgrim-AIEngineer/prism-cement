import { Prisma, PrismaClient } from "@prisma/client";

// Accepts either a full PrismaClient (for post-commit notifications) or a
// Prisma.TransactionClient (for in-transaction notifications).
type DbClient = PrismaClient | Prisma.TransactionClient;

// Write a notification row. Payload must already be stripped of cross-party
// identity — see payloads.ts.
export async function notify(
  db: DbClient,
  userId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.notification.create({ data: { userId, type, payload: payload as Prisma.InputJsonValue } });
}

// Finds all ADMIN users and notifies each one. Admin sees full detail — no stripping.
// Can be called inside or outside a transaction; pass `tx` to run inside, or `db` for post-commit.
export async function notifyAdmins(
  db: DbClient,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await Promise.all(admins.map((a) => notify(db, a.id, type, payload)));
}
