import { HttpError } from "../lib/http";
export type VerificationMailer = (email: string, link: string) => Promise<void>;
// A configured institutional delivery service sends the message. Tokens are never logged.
export function configuredMailer(): VerificationMailer {
  return async (email, verificationLink) => {
    const endpoint = process.env.EMAIL_DELIVERY_URL;
    const bearer = process.env.EMAIL_DELIVERY_TOKEN;
    if (!endpoint || !bearer || new URL(endpoint).protocol !== "https:")
      throw new HttpError(
        503,
        "Institutional email delivery is not configured. Contact the administrator.",
      );
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({
        to: email,
        template: "knoxite-email-verification",
        verificationLink,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new HttpError(503, "Email delivery is temporarily unavailable.");
  };
}
