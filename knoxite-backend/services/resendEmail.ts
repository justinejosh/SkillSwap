import { createHash } from "node:crypto";
import { HttpError } from "../lib/http";
import type { VerificationMailer } from "./email";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function resendMailer(
  env: NodeJS.ProcessEnv = process.env,
): VerificationMailer {
  const available = () =>
    !!env.RESEND_API_KEY &&
    env.EMAIL_SENDER_APPROVED === "true" &&
    /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.EMAIL_FROM || "");
  const mailer: VerificationMailer = async (
    email,
    link,
    purpose = "verification",
  ) => {
    if (!available())
      throw new HttpError(
        503,
        "Approved email sender and delivery credentials have not been configured.",
      );
    const url = new URL(link);
    const expected = new URL(env.PUBLIC_APP_URL || "http://localhost:5173");
    if (
      !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) ||
      url.origin !== expected.origin ||
      !["http:", "https:"].includes(expected.protocol) ||
      (expected.protocol !== "https:" &&
        !["localhost", "127.0.0.1"].includes(expected.hostname)) ||
      url.pathname !==
        (purpose === "verification" ? "/verify-email" : "/reset-password") ||
      url.search ||
      url.username ||
      url.password ||
      !/^#token=[A-Za-z0-9_-]{43}$/.test(url.hash)
    )
      throw new HttpError(422, "Invalid account email message.");
    const action =
      purpose === "verification"
        ? "Verify your institutional email"
        : "Reset your Knoxite password";
    const expiry = purpose === "verification" ? 30 : 15;
    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Idempotency-Key": createHash("sha256")
            .update(`${purpose}:${email}:${link}`)
            .digest("hex"),
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [email],
          subject: `Knoxite: ${action}`,
          text: `${action}\n\n${link}\n\nThis one-use link expires in ${expiry} minutes. If you did not request it, ignore this message. Knoxite will never ask you to email your password.`,
          html: `<p>${action}</p><p><a href="${escape(link)}">${action}</a></p><p>This one-use link expires in ${expiry} minutes. If you did not request it, ignore this message.</p>`,
        }),
      });
      const body = (await response.json()) as { id?: unknown };
      if (!response.ok || typeof body.id !== "string" || !body.id)
        throw new Error("Provider rejection");
    } catch {
      throw new HttpError(
        503,
        "Email delivery is temporarily unavailable. Please try again later.",
      );
    }
  };
  mailer.isConfigured = available;
  return mailer;
}
