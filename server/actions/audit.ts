"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireRole, RbacError } from "@/lib/rbac";

const auditFiltersSchema = z.object({
  entity: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().uuid().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export type AuditFilters = z.input<typeof auditFiltersSchema>;

// Read-only — audit_logs are append-only and never mutated (CLAUDE.md, PRD §9).
// Admin-only: this action returns the full log including actor identity.
export async function getAuditLogs(rawFilters: unknown) {
  const session = await getSession();
  try {
    requireRole(session, ["ADMIN"]);
  } catch (e) {
    return { ok: false as const, error: e instanceof RbacError ? e.message : "Unauthorized" };
  }

  const parsed = auditFiltersSchema.safeParse(rawFilters);
  if (!parsed.success) return { ok: false as const, error: "Invalid filters" };

  const { entity, action, actorId, dateFrom, dateTo, page, pageSize } = parsed.data;

  const where = {
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
    ...(actorId ? { actorId } : {}),
    ...(dateFrom || dateTo
      ? {
          ts: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { ts: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        before: true,
        after: true,
        ts: true,
        actorId: true,
        actor: {
          select: { id: true, phone: true, role: true },
        },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    ok: true as const,
    data: {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export type AuditLogEntry = NonNullable<
  Awaited<ReturnType<typeof getAuditLogs>>["data"]
>["logs"][number];
