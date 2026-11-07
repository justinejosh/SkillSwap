import { Prisma, PrismaClient } from "@prisma/client";

export const METRIC_POLICY = "partner-balanced-outcomes-v1";
export interface UserMetrics {
  metricPolicy: string;
  averageRating: number | null;
  rawAverageRating: number | null;
  ratingCount: number;
  uniqueRatingPartners: number;
  uniqueCompletedPartners: number;
  uniqueConcludedPartners: number;
  completedSwaps: number | null;
  validatedCompletedSwaps: number;
  eligibleConcludedSwaps: number;
  completionRate: number | null;
  rawCompletionRate: number | null;
  legacyConcludedSwaps: number;
}
export interface MetricOutcome {
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
}
const average = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function aggregateMetrics(
  userIds: string[],
  swaps: MetricOutcome[],
): Map<string, UserMetrics> {
  const accum = new Map(
    userIds.map((id) => [
      id,
      {
        completed: 0,
        concluded: 0,
        legacy: 0,
        ratings: [] as number[],
        partners: new Map<
          string,
          { completed: number; concluded: number; ratings: number[] }
        >(),
      },
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
      if (!s.requesterApprovedAt || !s.receiverApprovedAt) continue;
      const partnerId = s.requesterId === id ? s.receiverId : s.requesterId;
      const partner = a.partners.get(partnerId) ?? {
        completed: 0,
        concluded: 0,
        ratings: [],
      };
      partner.concluded++;
      a.concluded++;
      if (completed) {
        a.completed++;
        partner.completed++;
        const received = reviews
          .filter((r) => r.revieweeId === id)
          .map((r) => r.rating);
        a.ratings.push(...received);
        partner.ratings.push(...received);
      }
      a.partners.set(partnerId, partner);
    }
  }
  return new Map(
    [...accum].map(([id, a]) => {
      const partners = [...a.partners.values()];
      return [
        id,
        {
          metricPolicy: METRIC_POLICY,
          averageRating: average(
            partners
              .filter((p) => p.ratings.length)
              .map((p) => average(p.ratings)!),
          ),
          rawAverageRating: average(a.ratings),
          ratingCount: a.ratings.length,
          uniqueRatingPartners: partners.filter((p) => p.ratings.length).length,
          uniqueCompletedPartners: partners.filter((p) => p.completed > 0)
            .length,
          uniqueConcludedPartners: partners.length,
          completedSwaps: a.legacy ? null : a.completed,
          validatedCompletedSwaps: a.completed,
          eligibleConcludedSwaps: a.concluded,
          completionRate: a.legacy
            ? null
            : average(partners.map((p) => p.completed / p.concluded)),
          rawCompletionRate:
            a.legacy || !a.concluded ? null : a.completed / a.concluded,
          legacyConcludedSwaps: a.legacy,
        },
      ];
    }),
  );
}
export async function loadMetricOutcomes(
  db: PrismaClient | Prisma.TransactionClient,
  userIds?: string[],
) {
  if (userIds && !userIds.length) return [];
  return db.swap.findMany({
    where: {
      ...(userIds
        ? {
            OR: [
              { requesterId: { in: userIds } },
              { receiverId: { in: userIds } },
            ],
          }
        : {}),
      status: { in: ["COMPLETED", "CANCELLED"] },
    },
    select: {
      id: true,
      createdAt: true,
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
}
export async function loadUserMetrics(db: PrismaClient, userIds: string[]) {
  return aggregateMetrics(userIds, await loadMetricOutcomes(db, userIds));
}
