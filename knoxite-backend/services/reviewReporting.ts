import { Prisma } from "@prisma/client";

// Shared reporting population only. This does not alter review eligibility,
// validated exchange outcomes or partner-balanced WRMR calculations.
export const overviewReviewWhere = {
  isValidated: true,
  swap: { integrityVerified: true, status: "COMPLETED" },
} satisfies Prisma.ReviewWhereInput;
