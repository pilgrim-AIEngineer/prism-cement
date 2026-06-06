import { Prisma } from "@prisma/client";

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
}

// Last step of every mutation pipeline (.claude/rules/conventions.md), called
// with the SAME transaction client as the mutate step so they commit or roll
// back together — see [[audit-trail]]. `audit_logs` is append-only: this is
// the only function that should ever write to it.
export async function writeAudit(client: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: entry.before ?? Prisma.DbNull,
      after: entry.after ?? Prisma.DbNull,
    },
  });
}
