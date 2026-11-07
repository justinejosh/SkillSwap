# Account recovery and institutional verification

Password recovery and institutional email verification are separate requirements.
Neither a recovery request nor a completed password reset marks an email verified.
An unverified account still cannot sign in when verification is required.

## Student interface

- `/login` links **Forgot password?** to `/recover-account`, preserving the typed
  email in navigation state. No email address is placed in the URL.
- `/recover-account` requests an emailed password reset link. It explains missing
  delivery configuration instead of displaying an inactive contact button.
- `/reset-password#token=…` accepts matching new passwords and removes the token
  from browser history immediately after reading it into component memory. The
  token is never saved in local storage. Reset completion does not sign users in.
- Verification requests validate the email input independently of the password
  field. Accepted requests use a status notice rather than the red error box.
- The availability endpoint reports configuration, not successful delivery or
  account existence. Administrators still need to test their actual mail service.

## Backend controls

`GET /api/auth/recovery-options` exposes only `emailDeliveryAvailable`.
`POST /api/auth/request-password-reset` accepts only an email address and returns
the same accepted response for eligible, missing, and ineligible accounts. When
mail is unconfigured, both this endpoint and `request-verification` return an
account-independent 503 before querying account records.

`POST /api/auth/reset-password` accepts only a token and new password. Recovery
tokens contain 32 random bytes, expire after 15 minutes, and are stored only as
HMAC-SHA-256 hashes. Passwords require at least 12 characters and at most 72 UTF-8
bytes; bcrypt uses cost 12. Both recovery POST routes use the existing per-process
IP/path limit of ten attempts per fifteen minutes. Multi-instance deployments
still require the documented distributed edge limiter.

The existing `EmailVerificationToken` table provides the required user ownership,
expiry, and one-use fields. Recovery hashes use the
`knoxite:password-reset:v1:` namespace and the configured signing key; verification
keeps its previous hash format so previously issued verification links remain
usable. Both consumers also enforce exactly 43 base64url characters. The keyed
hash prevents a recovery token, including a namespace-prefixed token, from becoming
a verification preimage even for an older verification consumer. Rotating the
signing key also invalidates outstanding recovery links. Regression tests cover
namespace substitution and cross-purpose use in both directions. No schema
migration or data backfill is required.

Successful resets lock the user row, atomically consume the supplied token, update
only the password hash/token version, revoke existing sessions, and invalidate
all outstanding account links. Two simultaneous reset links cannot both change
the password. Normal authenticated password changes also invalidate outstanding
links. Email-verification status, account role, profile, skills, exchanges, and
reviews remain unchanged. Users with an unverified email can request a new
verification link after resetting. Suspended/ineligible accounts cannot reset.

## Mail configuration still required

The existing HTTPS webhook uses `EMAIL_DELIVERY_URL` and `EMAIL_DELIVERY_TOKEN`.
Its operator must support both JSON templates:

| Template | Link field |
| --- | --- |
| `knoxite-email-verification` | `verificationLink` |
| `knoxite-password-reset` | `resetLink` |

Both payloads include `to`. Configure `PUBLIC_APP_URL` for the intended frontend;
production requires HTTPS. A configured endpoint can still experience delivery
failure. Responses deliberately do not confirm that a particular address exists
or received a message. Undelivered tokens are marked used. No tokens or delivery
credentials are logged or returned by the public API.

No SMTP provider, support email address, ownership evidence, or campus-rule
confirmation is invented by this change. Do not disable verification or mark an
account verified simply to get around unavailable delivery.

## Local developer recovery

For the user's explicitly identified localhost account, a temporary one-use
password form was prepared outside the repository. It binds only to loopback,
checks Host, Origin, and a private form nonce, expires after fifteen minutes, and
lets the user choose their own password without sending it through chat. It has
no production route and makes no account change until the user submits. It
revokes sessions and outstanding links while preserving email-verification
status. Its generated form/credentials are not repository artifacts.

This fallback is privileged local developer assistance, not evidence of
institutional email ownership or the production recovery workflow.
