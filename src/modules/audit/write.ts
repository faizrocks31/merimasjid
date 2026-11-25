import { prisma } from "@/lib/db";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type AuditInput = {
  masjidId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

/** Appends an audit event. Audit rows are never updated or deleted. */
export async function writeAudit(tx: Tx, input: AuditInput): Promise<void> {
  await tx.auditLog.create({
    data: {
      masjidId: input.masjidId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      beforeJson: input.before === undefined ? null : JSON.stringify(input.before),
      afterJson: input.after === undefined ? null : JSON.stringify(input.after),
      metadata: input.metadata === undefined ? null : JSON.stringify(input.metadata),
    },
  });
}

/** Non-transactional convenience for read-only actions such as exports. */
export async function logAudit(input: AuditInput): Promise<void> {
  await writeAudit(prisma as unknown as Tx, input);
}
