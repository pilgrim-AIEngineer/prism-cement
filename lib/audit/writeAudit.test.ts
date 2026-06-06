import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { writeAudit } from "./writeAudit";

function fakeTransactionClient() {
  return { auditLog: { create: vi.fn().mockResolvedValue(undefined) } };
}

describe("writeAudit", () => {
  it("persists actor, action, entity, and before/after snapshots as given", async () => {
    const client = fakeTransactionClient();

    await writeAudit(client as unknown as Prisma.TransactionClient, {
      actorId: "admin-1",
      action: "VERIFY_USER",
      entity: "user",
      entityId: "user-1",
      before: { status: "PENDING" },
      after: { status: "VERIFIED" },
    });

    expect(client.auditLog.create).toHaveBeenCalledTimes(1);
    expect(client.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "admin-1",
        action: "VERIFY_USER",
        entity: "user",
        entityId: "user-1",
        before: { status: "PENDING" },
        after: { status: "VERIFIED" },
      },
    });
  });

  it("stores Prisma.DbNull (SQL NULL) when no snapshot is given, e.g. on create", async () => {
    const client = fakeTransactionClient();

    await writeAudit(client as unknown as Prisma.TransactionClient, {
      actorId: "vendor-1",
      action: "CREATE_BID",
      entity: "bid",
      entityId: "bid-1",
    });

    const [{ data }] = client.auditLog.create.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.before).toBe(Prisma.DbNull);
    expect(data.after).toBe(Prisma.DbNull);
  });

  it("allows a null actor for system/seed-attributed rows", async () => {
    const client = fakeTransactionClient();

    await writeAudit(client as unknown as Prisma.TransactionClient, {
      actorId: null,
      action: "SEED",
      entity: "category",
      entityId: "cat-1",
    });

    const [{ data }] = client.auditLog.create.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(data.actorId).toBeNull();
  });
});
