import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { loadConfig } from "../lib/config";
import { googleTestEnvironment } from "./googleFixture";

test("both leaderboards exclude legacy malformed addresses without changing metrics or leaking email", async () => {
  const config = loadConfig({ ...googleTestEnvironment(), GOOGLE_SIGN_IN_ENABLED: "false", INSTITUTION_EMAIL_DOMAINS: "student.fatima.edu.ph" });
  const candidates = [
    { id: "valid", email: "aasample1234lag@student.fatima.edu.ph" },
    { id: "invalid", email: "legacylag@student.fatima.edu.ph" },
    { id: "new", email: "bbsample1234lag@student.fatima.edu.ph" },
  ].map((u) => ({ ...u, name: "Synthetic " + u.id, avatarUrl: null, bio: "", program: null, yearLevel: null, yearLevelId: null, offeringLinks: [], wantedSkills: [] }));
  const outcomes = candidates.filter((u) => u.id !== "new").flatMap((u) => ["partner-one", "partner-two"].map((partner) => ({
    requesterId: u.id, receiverId: partner, status: "COMPLETED", integrityVerified: true,
    requesterApprovedAt: new Date(), receiverApprovedAt: new Date(), completedAt: new Date(),
    sessions: 1, requesterSessions: 1, receiverSessions: 1,
    reviews: [{ reviewerId: partner, revieweeId: u.id, rating: 5, isValidated: true }, { reviewerId: u.id, revieweeId: partner, rating: 5, isValidated: true }],
  })));
  const db: any = {
    authSession: { findFirst: async () => ({ id: "session", user: { id: "valid", email: candidates[0].email, role: "USER", isSuspended: false, emailVerifiedAt: new Date(), tokenVersion: 0 } }) },
    user: { findMany: async () => candidates }, swap: { findMany: async () => outcomes },
  };
  const server = createApp(db, config).listen(0, "127.0.0.1"); await once(server, "listening");
  try {
    const token = jwt.sign({ tokenVersion: 0 }, config.jwtSecret, { subject: "valid", jwtid: "session", issuer: "knoxite-api", audience: "knoxite", expiresIn: "5m" });
    for (const path of ["/api/leaderboard", "/api/leaderboard/swaps"]) {
      const r = await fetch(`http://127.0.0.1:${(server.address() as any).port}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(r.status, 200); const body: any = await r.json();
      const rows = Array.isArray(body) ? body : body.topMentors;
      assert.deepEqual(rows.map((u: any) => u.id), ["valid"]);
      assert.equal(rows[0].uniqueCompletedPartners, 2);
      assert.ok(!JSON.stringify(body).includes("@student.fatima.edu.ph"));
      if (Array.isArray(body)) { assert.equal(rows[0].totalSwaps, 2); assert.equal(rows[0].completionRate, 1); }
      else { assert.equal(rows[0].rating, 5); assert.equal(body.policy.minimumCompletedPartners, 2); }
    }
  } finally { server.close(); await once(server, "close"); }
});
