"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uuidSchema } from "@/lib/validation/common";
import type { ActionResult } from "@/server/types";
import { fail } from "@/server/actions/utils";

export interface NotificationItem {
  id: string;
  type: string;
  payload: unknown;
  readAt: Date | null;
  createdAt: Date;
}


export async function getNotifications(): Promise<ActionResult<NotificationItem[]>> {
  const session = await getSession();
  if (!session) return fail("Unauthenticated");

  const rows = await db.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, payload: true, readAt: true, createdAt: true },
    take: 100,
  });

  return { ok: true, data: rows };
}

export async function getUnreadCount(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;
  return db.notification.count({ where: { userId: session.userId, readAt: null } });
}

export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  // 1. Validate
  const parsed = uuidSchema.safeParse(notificationId);
  if (!parsed.success) return fail("Invalid notification ID");

  // 2. Session
  const session = await getSession();
  if (!session) return fail("Unauthenticated");

  // 3. Ownership: update only if it belongs to this user (WHERE clause enforces it).
  const updated = await db.notification.updateMany({
    where: { id: parsed.data, userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });

  if (updated.count === 0) return { ok: true, data: undefined }; // already read or not found — idempotent

  return { ok: true, data: undefined };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return fail("Unauthenticated");

  await db.notification.updateMany({
    where: { userId: session.userId, readAt: null },
    data: { readAt: new Date() },
  });

  return { ok: true, data: undefined };
}
