import { PrismaClient } from "@prisma/client";
export interface UserMetrics {
  averageRating: number | null;
  ratingCount: number;
  completedSwaps: number | null;
  validatedCompletedSwaps: number;
  eligibleConcludedSwaps: number;
  completionRate: number | null;
  legacyConcludedSwaps: number;
}
export function aggregateMetrics(
  userIds: string[],
  swaps: Array<{
    requesterId: string;
    receiverId: string;
    status: string;
    integrityVerified: boolean;
    requesterApprovedAt: Date | null;
    receiverApprovedAt: Date | null;
    completedAt: Date | null;
    sessions: number;
    requesterSessions: number;
    receiverSessions: number;
    reviews: Array<{
      reviewerId: string;
      revieweeId: string;
      rating: number;
      isValidated: boolean;
    }>;
  }>,
): Map<string, UserMetrics> {
  const accum = new Map(
    userIds.map((id) => [
      id,
      { completed: 0, concluded: 0, legacy: 0, ratings: [] as number[] },
    ]),
  );
  for (const s of swaps) {
    const people = [...new Set([s.requesterId, s.receiverId])];
    if (!["COMPLETED", "CANCELLED"].includes(s.status)) continue;
    const reviews = s.reviews.filter(
      (r) =>
        r.isValidated &&
        Number.isInteger(r.rating) &&
        r.rating >= 1 &&
        r.rating <= 5 &&
        ((r.reviewerId === s.requesterId && r.revieweeId === s.receiverId) ||
          (r.reviewerId === s.receiverId && r.revieweeId === s.requesterId)),
    );
    const completed =
      s.status === "COMPLETED" &&
      !!s.completedAt &&
      s.sessions > 0 &&
      s.requesterSessions >= s.sessions &&
      s.receiverSessions >= s.sessions &&
      new Set(reviews.map((r) => r.reviewerId)).size === 2 &&
      reviews.length === 2;
    const reliable =
      s.requesterId !== s.receiverId &&
      s.integrityVerified &&
      (s.status === "CANCELLED" ||
        (!!s.requesterApprovedAt && !!s.receiverApprovedAt && completed));
    for (const id of people) {
      const a = accum.get(id);
      if (!a) continue;
      if (!reliable) {
        a.legacy++;
        continue;
      }
      // Cancellation before bilateral confirmation is not an attempted teaching exchange.
      if (!s.requesterApprovedAt || !s.receiverApprovedAt) continue;
      a.concluded++;
      if (completed) {
        a.completed++;
        a.ratings.push(
          ...reviews.filter((r) => r.revieweeId === id).map((r) => r.rating),
        );
      }
    }
  }
  return new Map(
    [...accum].map(([id, a]) => [
      id,
      {
        averageRating: a.ratings.length
          ? a.ratings.reduce((x, y) => x + y, 0) / a.ratings.length
          : null,
        ratingCount: a.ratings.length,
        completedSwaps: a.legacy ? null : a.completed,
        validatedCompletedSwaps: a.completed,
        eligibleConcludedSwaps: a.concluded,
        completionRate:
          a.legacy || !a.concluded ? null : a.completed / a.concluded,
        legacyConcludedSwaps: a.legacy,
      },
    ]),
  );
}
export async function loadUserMetrics(db: PrismaClient, userIds: string[]) {
  if (!userIds.length) return new Map<string, UserMetrics>();
  const swaps = await db.swap.findMany({
    where: {
      OR: [{ requesterId: { in: userIds } }, { receiverId: { in: userIds } }],
      status: { in: ["COMPLETED", "CANCELLED"] },
    },
    select: {
      requesterId: true,
      receiverId: true,
      status: true,
      integrityVerified: true,
      requesterApprovedAt: true,
      receiverApprovedAt: true,
      completedAt: true,
      sessions: true,
      requesterSessions: true,
      receiverSessions: true,
      reviews: {
        select: {
          reviewerId: true,
          revieweeId: true,
          rating: true,
          isValidated: true,
        },
      },
    },
  });
  return aggregateMetrics(userIds, swaps);
}
