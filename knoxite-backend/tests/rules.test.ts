import test from "node:test";
import assert from "node:assert/strict";
import { academicProximity } from "../services/academicProximity";
import { compareMatches, wrmr } from "../services/wrmr";
import {
  allowance,
  grade,
  promotedTier,
  shuffled,
} from "../services/assessmentRules";
import { validateBankInput } from "../services/bankValidation";
import { aggregateMetrics } from "../services/userMetrics";
import { loadConfig, studentEmailAllowed } from "../lib/config";
import { academicInfo } from "../services/academics";
import { requireLocalDatabase } from "../scripts/safeDatabase";
const me = { departmentId: "department-a", yearLevelId: "year-1" };
test("campus domain and suffix are separate configurable rules", () => {
  const config = loadConfig({ JWT_SECRET: "x".repeat(40) });
  assert.equal(
    studentEmailAllowed("student1234lag@student.fatima.edu.ph", config),
    true,
  );
  for (const email of [
    "lag@student.fatima.edu.ph",
    "student123@student.fatima.edu.ph",
    "student123lag@gmail.com",
    "student123lag@student.fatima.edu.ph.evil.example",
  ])
    assert.equal(studentEmailAllowed(email, config), false);
  assert.equal(config.campusRuleConfirmed, false);
  assert.throws(() =>
    loadConfig({
      JWT_SECRET: "x".repeat(40),
      NODE_ENV: "production",
      PUBLIC_APP_URL: "https://example.invalid",
    }),
  );
});
test("department comes from a validated mapping and is never inferred from program identity", () => {
  const student = {
    program: {
      isActive: true,
      departmentId: "d1",
      mappingValidatedAt: null as Date | null,
      department: { isActive: true },
    },
    yearLevelId: "y1",
    yearLevel: { isActive: true },
  };
  assert.equal(academicInfo(student).departmentId, null);
  student.program.mappingValidatedAt = new Date();
  assert.equal(academicInfo(student).departmentId, "d1");
  student.program.department.isActive = false;
  assert.equal(academicInfo(student).departmentId, null);
});
for (const [departmentId, yearLevelId, proximity, score] of [
  ["department-a", "year-1", 1, 89],
  ["department-a", "year-2", 0.8, 85],
  ["department-b", "year-1", 0.6, 81],
  ["department-b", "year-2", 0.4, 77],
] as const) {
  test(`academic proximity ${departmentId}/${yearLevelId} and exact WRMR`, () => {
    const result = academicProximity(me, { departmentId, yearLevelId });
    assert.equal(result.value, proximity);
    assert.equal(wrmr(4.5, 0.8, result.value).score, score);
    assert.equal(
      academicProximity({ departmentId, yearLevelId }, me).value,
      proximity,
    );
  });
}
test("missing academics never match nulls, and missing factors never redistribute weights", () => {
  assert.equal(
    academicProximity(
      { departmentId: null, yearLevelId: null },
      { departmentId: null, yearLevelId: null },
    ).value,
    null,
  );
  assert.equal(academicProximity(me, { ...me, yearLevelId: null }).value, null);
  for (const inputs of [
    [null, 1, 1],
    [5, null, 1],
    [5, 1, null],
  ] as const)
    assert.equal(wrmr(inputs[0], inputs[1], inputs[2]).score, null);
  assert.equal(wrmr(5, 1, 1).score, 100);
  assert.equal(wrmr(5, 0, 0.4).score, 58);
  assert.throws(() => wrmr(6, 1, 1));
  assert.throws(() => wrmr(5, NaN, 1));
  assert.throws(() => wrmr(5, 1, -1));
});
test("rank ties are deterministic and unranked candidates remain present", () => {
  const sorted = [
    { id: "c", matchScore: null },
    { id: "b", matchScore: 81 },
    { id: "a", matchScore: 81 },
  ].sort(compareMatches);
  assert.deepEqual(
    sorted.map((s) => s.id),
    ["a", "b", "c"],
  );
});
const items = Array.from({ length: 10 }, (_, i) => ({
  id: `q${i}`,
  points: 1,
  options: [
    { id: `correct-${i}`, isCorrect: true },
    { id: `wrong-${i}`, isCorrect: false },
  ],
}));
const answers = (right: number) =>
  items.map((q, i) => ({
    questionId: q.id,
    optionId: `${i < right ? "correct" : "wrong"}-${i}`,
  }));
test("backend grading requires 8/10 at 80%, uses version thresholds and counts omissions as zero", () => {
  assert.equal(grade(items, answers(7), 80).passed, false);
  assert.equal(grade(items, answers(8), 80).passed, true);
  assert.equal(grade(items, answers(8), 90).passed, false);
  assert.equal(grade(items, answers(10).slice(0, 7), 80).earnedPoints, 7);
  const weighted = [
    { ...items[0], points: 79 },
    { ...items[1], points: 21 },
  ];
  assert.equal(grade(weighted, [answers(10)[0]], 80).passed, false);
});
test("tampered and duplicate answers are rejected", () => {
  assert.throws(() => grade(items, [answers(10)[0], answers(10)[0]], 80));
  assert.throws(() =>
    grade(items, [{ questionId: "foreign", optionId: "correct-1" }], 80),
  );
  assert.throws(() =>
    grade(items, [{ questionId: "q0", optionId: "correct-1" }], 80),
  );
  assert.throws(() => grade(items, [{ ...answers(10)[0], score: 100 }], 80));
});
test("randomization preserves unique items, options, and grading identity", () => {
  const order = shuffled(items, () => 0);
  assert.deepEqual(
    new Set(order.map((q) => q.id)),
    new Set(items.map((q) => q.id)),
  );
  assert.notDeepEqual(
    order.map((q) => q.id),
    items.map((q) => q.id),
  );
  assert.equal(
    grade(
      order.map((q) => ({ ...q, options: [...q.options].reverse() })),
      answers(8),
      80,
    ).passed,
    true,
  );
});
test("tier promotion never downgrades earned status", () => {
  assert.equal(promotedTier("NOT_ASSESSED", "BASIC", true), "AMATEUR");
  assert.equal(promotedTier("AMATEUR", "ADVANCED", true), "VERIFIED");
  assert.equal(promotedTier("AMATEUR", "ADVANCED", false), "AMATEUR");
  assert.equal(promotedTier("VERIFIED", "BASIC", false), "VERIFIED");
  assert.throws(() => promotedTier("NOT_ASSESSED", "ADVANCED", true));
});
test("retake rules count starts across versions, expired attempts, and cooldown boundaries", () => {
  const now = new Date("2026-11-07T10:00:00Z");
  const failed = {
    status: "FAILED",
    startedAt: new Date("2026-11-06T09:00:00Z"),
    expiresAt: new Date("2026-11-06T09:20:00Z"),
    gradedAt: new Date("2026-11-06T10:00:00Z"),
  };
  assert.equal(allowance([failed], now).allowed, true);
  assert.equal(
    allowance([{ ...failed, gradedAt: new Date("2026-11-06T10:00:01Z") }], now)
      .allowed,
    false,
  );
  assert.equal(allowance([failed, failed, failed], now).allowed, false);
  assert.equal(
    allowance(
      [
        {
          ...failed,
          status: "IN_PROGRESS",
          expiresAt: new Date(now.getTime() + 1000),
        },
      ],
      now,
    ).allowed,
    true,
  );
  assert.equal(
    allowance(
      [
        {
          ...failed,
          status: "IN_PROGRESS",
          expiresAt: new Date(now.getTime() - 1000),
        },
      ],
      now,
    ).allowed,
    false,
  );
});
test("legacy outcomes are excluded without inventing a completion rate", () => {
  const empty = aggregateMetrics(["a"], []).get("a")!;
  assert.equal(empty.completedSwaps, 0);
  assert.equal(empty.averageRating, null);
  assert.equal(empty.completionRate, null);
  const base = {
    requesterId: "a",
    receiverId: "b",
    status: "CANCELLED",
    integrityVerified: true,
    requesterApprovedAt: new Date(),
    receiverApprovedAt: new Date(),
    completedAt: null,
    sessions: 1,
    requesterSessions: 0,
    receiverSessions: 0,
    reviews: [],
  };
  assert.equal(
    aggregateMetrics(["a", "b"], [base]).get("a")!.completionRate,
    0,
  );
  const legacy = aggregateMetrics(
    ["a"],
    [{ ...base, integrityVerified: false }],
  ).get("a")!;
  assert.equal(legacy.completedSwaps, null);
  assert.equal(legacy.completionRate, null);
  assert.equal(legacy.legacyConcludedSwaps, 1);
  const fake = {
    ...base,
    status: "COMPLETED",
    completedAt: new Date(),
    requesterSessions: 1,
    receiverSessions: 1,
    reviews: [
      { reviewerId: "a", revieweeId: "b", rating: 5, isValidated: true },
      { reviewerId: "a", revieweeId: "b", rating: 5, isValidated: true },
    ],
  };
  assert.equal(aggregateMetrics(["a"], [fake]).get("a")!.completedSwaps, null);
});
test("configuration fails closed and database tooling rejects remote targets", () => {
  assert.throws(() => loadConfig({ JWT_SECRET: "short" }));
  assert.throws(() =>
    loadConfig({ JWT_SECRET: "x".repeat(40), NODE_ENV: "production" }),
  );
  assert.throws(() =>
    requireLocalDatabase({ DATABASE_URL: "mysql://x@127.0.0.1/app_test" }),
  );
  const acknowledgement = {
    KNOXITE_LOCAL_DATABASE_ACK: "local-synthetic-or-sanitized",
  };
  assert.throws(() =>
    requireLocalDatabase({
      ...acknowledgement,
      DATABASE_URL: "mysql://x@remote.example/app_test",
    }),
  );
  assert.throws(() =>
    requireLocalDatabase({
      ...acknowledgement,
      DATABASE_URL: "mysql://x@127.0.0.1/production",
    }),
  );
  assert.equal(
    requireLocalDatabase({
      ...acknowledgement,
      DATABASE_URL: "mysql://x@127.0.0.1/app_test",
    }),
    "mysql://x@127.0.0.1/app_test",
  );
});
test("bank publishing input forbids missing keys, incomplete pools and unsupported advanced formats", () => {
  const bank = {
    skillId: "synthetic",
    level: "BASIC",
    title: "Synthetic test bank",
    learningOutcomes: "Test fixture only",
    items: items.map((q, i) => ({
      kind: "MULTIPLE_CHOICE",
      prompt: `Synthetic item ${i}`,
      competency: "Fixture",
      rubric: "One point for the configured choice",
      points: 1,
      options: q.options.map((o) => ({ text: o.id, isCorrect: o.isCorrect })),
    })),
  };
  assert.equal(validateBankInput(bank).questionCount, 10);
  assert.equal(validateBankInput(bank).passingPercent, 80);
  assert.throws(() => validateBankInput({ ...bank, items: [] }));
  assert.throws(() => validateBankInput({ ...bank, level: "ADVANCED" }));
  assert.throws(() => validateBankInput({ ...bank, tier: "VERIFIED" }));
});

test("production activation requires confirmed eligibility, ownership verification and HTTPS", () => {
  const proposed = {
    JWT_SECRET: "synthetic-config-test-secret-".repeat(2),
    NODE_ENV: "production",
    SESSION_TIMEOUTS_ENABLED:"true",REGISTRATION_CONSENT_ENABLED:"true",REGISTRATION_NOTICE_APPROVED:"true",REGISTRATION_NOTICE_VERSION:"TEST_NOTICE_v1",
    INSTITUTION_EMAIL_DOMAINS: "student.fatima.edu.ph",
    CAMPUS_EMAIL_SUFFIX: "lag",
    PUBLIC_APP_URL: "https://example.invalid",
    CORS_ORIGINS: "https://example.invalid",
  };
  assert.throws(() => loadConfig(proposed), /Officially confirm/);
  assert.throws(
    () => loadConfig({ ...proposed, CAMPUS_EMAIL_RULE_CONFIRMED: "false" }),
    /Officially confirm/,
  );
  const confirmed = { ...proposed, CAMPUS_EMAIL_RULE_CONFIRMED: "true" };
  assert.throws(
    () => loadConfig({ ...confirmed, INSTITUTION_EMAIL_DOMAINS: "" }),
    /Production requires/,
  );
  assert.throws(
    () => loadConfig({ ...confirmed, EMAIL_VERIFICATION_REQUIRED: "false" }),
    /Production requires/,
  );
  assert.throws(
    () =>
      loadConfig({ ...confirmed, PUBLIC_APP_URL: "http://example.invalid" }),
    /HTTPS/,
  );
  const ready = loadConfig(confirmed);
  assert.equal(ready.campusRuleConfirmed, true);
  assert.equal(ready.verificationRequired, true);
});
