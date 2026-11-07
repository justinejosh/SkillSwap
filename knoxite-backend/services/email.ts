import { HttpError } from "../lib/http";
export type MailPurpose = "verification" | "password-reset";
export type VerificationMailer = ((
  email: string,
  link: string,
  purpose?: MailPurpose,
) => Promise<void>) & { isConfigured?: () => boolean };
// A configured institutional delivery service sends the message. Tokens are never logged.
export function configuredMailer(): VerificationMailer {
  const mailer: VerificationMailer = async (
    email,
    link,
    purpose = "verification",
  ) => {
    const endpoint = process.env.EMAIL_DELIVERY_URL;
    const bearer = process.env.EMAIL_DELIVERY_TOKEN;
    if (!mailer.isConfigured!())
      throw new HttpError(
        503,
        "Institutional email delivery is not configured. Contact the administrator.",
      );
    const response = await fetch(endpoint!, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({
        to: email,
        template:
          purpose === "password-reset"
            ? "knoxite-password-reset"
            : "knoxite-email-verification",
        ...(purpose === "password-reset"
          ? { resetLink: link }
          : { verificationLink: link }),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new HttpError(503, "Email delivery is temporarily unavailable.");
  };
  mailer.isConfigured = () => {
    try {
      const url = new URL(process.env.EMAIL_DELIVERY_URL || "");
      return (
        !!process.env.EMAIL_DELIVERY_TOKEN &&
        url.protocol === "https:" &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  };
  return mailer;
}
