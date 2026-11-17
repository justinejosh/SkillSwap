import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { MailPurpose, VerificationMailer } from "../services/email";
import { requireSyntheticEnvironment, syntheticDomain } from "./safety";
export interface CapturedMail {
  to: string;
  link: string;
  purpose: MailPurpose;
  capturedAt: string;
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function syntheticMailbox(
  directory: string,
  env: NodeJS.ProcessEnv = process.env,
): VerificationMailer {
  requireSyntheticEnvironment(env);
  return async (email, link, purpose = "verification") => {
    requireSyntheticEnvironment(env);
    const url = new URL(link);
    if (
      !new RegExp(
        `^[a-z0-9._-]+lag@${syntheticDomain.replace(/\./g, "\\.")}$`,
      ).test(email) ||
      url.origin !== env.PUBLIC_APP_URL ||
      url.pathname !==
        (purpose === "verification" ? "/verify-email" : "/reset-password") ||
      url.search ||
      !/^#token=[A-Za-z0-9_-]{43}$/.test(url.hash)
    )
      throw new Error("Only synthetic account messages may be captured.");
    const file = join(directory, "mailbox.json");
    const previous: CapturedMail[] = existsSync(file)
      ? JSON.parse(readFileSync(file, "utf8"))
      : [];
    const messages = [
      { to: email, link, purpose, capturedAt: new Date().toISOString() },
      ...previous,
    ]
      .filter((m) => Date.now() - new Date(m.capturedAt).getTime() < 30 * 60000)
      .slice(0, 50);
    writeFileSync(file + ".tmp", JSON.stringify(messages, null, 2), {
      mode: 0o600,
    });
    renameSync(file + ".tmp", file);
    const html = `<!doctype html><meta charset="utf-8"><title>Knoxite synthetic mailbox</title><style>body{font:16px system-ui;max-width:760px;margin:40px auto;padding:20px}article{border:1px solid #ddd;padding:16px;margin:12px 0}header{background:#fff3cd;padding:16px}a{color:#1745bd}</style><header><h1>Synthetic development mailbox</h1><p>No real email was sent. These links work only in the isolated sandbox. Refresh this file after requesting a message. Links expire and can be used once.</p></header>${messages.map((m) => `<article><b>${escape(m.to)}</b><p>${escape(m.purpose)} · ${escape(m.capturedAt)}</p><a href="${escape(m.link)}">${m.purpose === "verification" ? "Verify synthetic email" : "Reset synthetic password"}</a></article>`).join("")}`;
    writeFileSync(join(directory, "mailbox.html.tmp"), html, { mode: 0o600 });
    renameSync(
      join(directory, "mailbox.html.tmp"),
      join(directory, "mailbox.html"),
    );
  };
}
