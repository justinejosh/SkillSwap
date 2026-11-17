import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { AppConfig } from "../lib/config";
import { HttpError } from "../lib/http";

export function registrationPolicy(config: AppConfig) {
  const policy = config.registrationConsent;
  return { available: !!policy?.enabled, noticeVersion: policy?.enabled ? policy.version : null, approved: !!policy?.approved };
}
export function requireRegistrationConsent(accepted: unknown, suppliedVersion: unknown, config: AppConfig) {
  if (accepted !== true) throw new HttpError(422, "Accept the Terms of Service and Privacy Policy.");
  const policy = config.registrationConsent;
  if (!policy?.enabled || !policy.version)
    throw new HttpError(503, "New registration is unavailable until consent storage and a reviewed notice are configured. Existing accounts can still sign in.");
  if (suppliedVersion !== policy.version)
    throw new HttpError(409, "The registration notice changed. Reload and review the current Terms and Privacy Policy.");
  return policy.version;
}
// Bound SQL retains the shared legacy Prisma client/schema fingerprint.
// Existing login and account linking never create or fabricate consent records.
export async function recordRegistrationConsent(tx: Prisma.TransactionClient, userId: string, version: string) {
  const id = randomUUID(), acceptedAt = new Date();
  try {
    await tx.$executeRaw`INSERT INTO RegistrationConsent (id, userId, noticeVersion, acceptedAt) VALUES (${id}, ${userId}, ${version}, ${acceptedAt})`;
  } catch(error) {
    const failure=error as {code?:string;meta?:{code?:string}};
    if(failure.code==="P2010"&&["1146","1054"].includes(String(failure.meta?.code)))
      throw new HttpError(503,"Consent storage is unavailable. Registration was not created; existing accounts can still sign in.");
    throw error;
  }
}
