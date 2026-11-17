import { OAuth2Client, TokenPayload } from "google-auth-library";
import { AppConfig, studentEmailAllowed, pilotAccountAllowed } from "../lib/config";
import { HttpError } from "../lib/http";

export type GoogleVerifier = (
  credential: string,
  clientId: string,
) => Promise<TokenPayload>;
export function googleVerifier(client = new OAuth2Client()): GoogleVerifier {
  return async (credential, clientId) => {
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload) throw new Error("Missing claims");
      return payload;
    } catch {
      // Never log credentials, Google errors containing tokens, or claim payloads.
      throw new HttpError(
        401,
        "Google could not verify this sign-in. Please try again.",
      );
    }
  };
}
export function eligibleGoogleIdentity(
  payload: TokenPayload,
  config: AppConfig,
) {
  const email =
    typeof payload.email === "string" ? payload.email.toLowerCase() : "";
  if (
    !config.google.enabled ||
    !["accounts.google.com", "https://accounts.google.com"].includes(
      payload.iss,
    ) ||
    payload.aud !== config.google.clientId ||
    !Number.isFinite(payload.exp) ||
    payload.exp <= Date.now() / 1000 ||
    !Number.isFinite(payload.iat) ||
    payload.iat > Date.now() / 1000 + 60 ||
    typeof payload.sub !== "string" ||
    !/^[\x21-\x7e]{1,255}$/.test(payload.sub) ||
    payload.email_verified !== true ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 191 ||
    typeof payload.hd !== "string" ||
    !config.google.hostedDomains.includes(payload.hd.toLowerCase()) ||
    !studentEmailAllowed(email, config)
  ) {
    throw new HttpError(
      403,
      "Use an eligible institutional Google Workspace account under the approved Santa Rosa college-student policy.",
    );
  }
  // Called only after the backend verifier accepted the signed Google token.
  if (!pilotAccountAllowed(email, config))
    throw new HttpError(403, "This account is not authorized for the local OAuth pilot.");
  return {
    subject: payload.sub,
    email,
    hostedDomain: payload.hd.toLowerCase(),
    name: typeof payload.name === "string" ? payload.name.slice(0, 100) : "",
  };
}
