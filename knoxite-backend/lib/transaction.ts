import { Prisma, PrismaClient } from "@prisma/client";

// Lock the stable parent row to serialize assessments and swap lifecycle changes.
// Parameters are bound, never concatenated into SQL.
export async function lockOffering(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM UserOfferedSkill WHERE id = ${id} FOR UPDATE`;
}
export async function lockSwap(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM Swap WHERE id = ${id} FOR UPDATE`;
}
export function transaction<T>(
  db: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return db.$transaction(fn, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    timeout: 15000,
  });
}
