import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
export async function credentialStatus(
  db: Pick<PrismaClient, "user">,
  account: { email: string; password: string },
) {
  const user = await db.user.findUnique({
    where: { email: account.email },
    select: {
      passwordHash: true,
      emailVerifiedAt: true,
      isSuspended: true,
      role: true,
    },
  });
  return {
    exists: !!user,
    passwordMatches:
      !!user?.passwordHash &&
      (await bcrypt.compare(account.password, user.passwordHash)),
    verified: !!user?.emailVerifiedAt,
    suspended: !!user?.isSuspended,
    role: user?.role || null,
  };
}
