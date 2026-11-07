# Institutional verification and recovery email delivery

## Confirmed local diagnosis

The inspected local environment has neither `EMAIL_DELIVERY_URL` nor
`EMAIL_DELIVERY_TOKEN`. `GET /api/auth/recovery-options` returns
`{"emailDeliveryAvailable":false}`. `services/email.ts` consequently cannot send
mail. This is a missing integration configuration, not evidence of a rejected
institutional address. The endpoint checks configuration, not live deliverability.
No production environment or mail provider was inspected or changed.

## What must be configured

The current implementation calls a **custom HTTPS JSON delivery webhook**. It is
not an SMTP client and cannot directly use an SMTP hostname, a Gmail login, the
frontend URL, a Google OAuth client ID, or Google's ID-token endpoint as its URL.
An approved mail service or adapter must implement the contract below. Provider
selection, institutional sender approval, credentials, and access are still
required; no sender/address/service has been invented.

1. Choose the approved institutional sender and mail provider/adapter owner.
   Confirm permission to send to student mailboxes and the provider's sender/domain
   authentication requirements. Arrange delivery-failure monitoring and a support
   contact for students.
2. Implement/configure a TLS-protected webhook with the two fixed templates below.
   Validate the bearer token, recipient, template, and app link origin. Allow only
   authorized Knoxite messages; do not make the adapter an open relay.
3. Store its HTTPS endpoint and strong adapter bearer credential privately in the
   **backend** environment as `EMAIL_DELIVERY_URL` and `EMAIL_DELIVERY_TOKEN`.
   Do not use a Google ID token or OAuth client secret as this bearer credential.
   Do not put sender/provider credentials in React `VITE_` variables or Git.
4. Set `PUBLIC_APP_URL` to the intended frontend origin. Local example:
   `http://localhost:5173`. Any future release frontend must use its approved HTTPS
   origin; changing this value does not authorize a deployment.
5. Restart only an authorized local/test backend and verify the checklist below.
   Keep email verification required. A successful configuration check alone is
   insufficient to activate student testing.

## Request contract

The backend makes this request with a ten-second timeout and refuses redirects,
so private account links are not forwarded to another endpoint:

```http
POST /your-private-delivery-endpoint
Content-Type: application/json
Authorization: Bearer <private-adapter-credential>
```

Verification body (example placeholders, not a working link):

```json
{
  "to": "eligible-student@student.example.invalid",
  "template": "knoxite-email-verification",
  "verificationLink": "https://approved-app.example.invalid/verify-email#token=<opaque-token>"
}
```

Password reset/password setup body:

```json
{
  "to": "eligible-student@student.example.invalid",
  "template": "knoxite-password-reset",
  "resetLink": "https://approved-app.example.invalid/reset-password#token=<opaque-token>"
}
```

The adapter must substitute the correct link into the appropriate human-readable
template, escape text/HTML, and preserve the full `#token=...` fragment. Do not
append tracking parameters to a token or expose links in public logs/analytics.
Verification links expire after 30 minutes; reset/setup links after 15 minutes.
Do not send a plaintext password. Knoxite does not need access to inbox contents.
Using Google Sign-In does not grant permission to send email through Gmail.

Return a 2xx response only when the message has been accepted into the provider's
delivery process. The backend does not inspect a response body. A 2xx is not
proof the recipient received the message; the operator must check provider
delivery/bounce results. Non-2xx responses, timeout, TLS failure, or redirect
are treated as delivery failure, and the created account link is invalidated.
Actual provider testing must include these failures. No automatic queue/retry
or webhook receiver is implemented in Knoxite by this change.

## User-facing behavior

- Registration preserves the created account as unverified when delivery fails.
  It can request a new verification link after mail is restored.
- When delivery is unconfigured, verification/reset requests return an
  account-independent 503 before looking up a user; the UI explains unavailability.
- With configuration present, request acknowledgments deliberately do not reveal
  whether an account exists or a particular message was delivered.
- Emailed verification remains the ownership proof for non-Google registrations.
  Password resets never set `emailVerifiedAt` or change eligibility/roles.
- An approved Google-only user can use the same reset email to establish a local
  password. The successful reset revokes sessions and outstanding account links.
  Without functioning mail, that fallback cannot be established.
- An ordinary password change still requires the current password. An unverified
  or suspended account does not become eligible simply by resetting its password.

## Local/institutional acceptance checklist

Use a separately approved test mailbox and isolated database. Do not send to real
students or production without explicit authorization.

1. Configuration status changes to available without exposing endpoint secrets.
2. Both templates arrive at an eligible institutional test mailbox with the
   correct sender, subject, link origin, and intact token fragment.
3. Verification activates only the addressed account; expired/replayed links fail.
4. Reset changes only that account's password, revokes prior sessions, and leaves
   institutional verification unchanged. Google-only password setup then permits
   email/password login.
5. Invalid adapter authentication, bad TLS, redirects, non-2xx, timeout, provider
   rejection, bounced delivery, resend, and rate limits have reviewed behavior.
6. Tokens, passwords, message bodies, and delivery credentials are absent from
   application/provider public logs, screenshots, browser analytics, and Git.
7. The team records test results and who owns sender credentials, rotation,
   delivery monitoring, and student support.

Automated tests inject mail capture or mock the webhook request. They verify the
contract, missing configuration, distinct templates, and no-redirect policy;
they do not demonstrate actual institutional mail delivery. Never disable
verification or mark email ownership verified to hide a delivery problem.
