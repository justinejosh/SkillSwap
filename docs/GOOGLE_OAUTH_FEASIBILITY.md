# Optional Google sign-in: feasibility review

Update 2026-11-14: the team confirmed the Laguna initials/surname/four-digit email structure, and the user reports a successful signed-identity diagnostic for one OLFU account with `hd=student.fatima.edu.ph`. That domain is prepared in the separate local allowlist. No IT/university-wide approval or current-enrollment proof is inferred, and normal Google Sign-In remains disabled pending approval. See [pilot readiness](GOOGLE_OAUTH_PILOT_READINESS.md) and [local activation instructions](GOOGLE_OAUTH_LOCAL_ACTIVATION.md). Recovery-1 remains Google-disabled; older provisional statements below are historical background.

Status reviewed 2026-11-13: **implemented locally, disabled by default**. The original feasibility review below is retained as background; [GOOGLE_SIGN_IN.md](GOOGLE_SIGN_IN.md) documents the implemented flow and activation gates. Institutional approvals and a real-account pilot remain outstanding. Email/password authentication, institutional verification and password recovery remain available independently when delivery is configured.

Google Identity Services can fit the React/Express architecture without replacing Knoxite's local users, roles, or sessions. Feasibility depends on OLFU confirming that its institutional student accounts support the chosen Google identity flow and permit the application. No claim is made that the proposed `lag` suffix is an official campus identifier.

Google requires a configured web client ID, application branding, authorized origins, and applicable redirect configuration. See [Google's setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

The implemented backend uses `google-auth-library` to verify Google's signature, audience, issuer and expiry, then checks verified email, approved hosted domain and campus policy. Backend-issued single-use challenges bind the nonce and purpose; origin checks and existing session authorization protect linking. Provider identity uses Google's stable `sub`, not email matching. See `knoxite-backend/services/googleIdentity.ts`, `routes/google.ts`, `lib/config.ts` and [Google's server verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token). Synthetic verifier tests establish local behavior, not authorization by OLFU or successful real Workspace sign-in.

## Institutional questions before approval

1. Are college student accounts Google Workspace accounts, and which hosted-domain claim values are legitimate? Do not infer this list from the visible email domain.
2. Does institutional IT allow this application and the intended account population? Who owns the Cloud project, credentials, consent configuration, and recovery process?
3. Is `@student.fatima.edu.ph` authoritative for the intended population, and does `lag` uniquely and reliably identify Santa Rosa/Laguna students?
4. How will college enrollment be established and maintained? Neither choosing a college program nor proving mailbox ownership necessarily proves current enrollment.
5. Which development and production origins/redirects will be approved, and who handles privacy notices and account lifecycle changes?

## Implemented architecture and remaining activation approval

The Prisma schema contains the provider identity relation, single-use challenges and onboarding tickets. Identities attach to existing local User IDs; matching email addresses never automatically merge accounts. Linking requires an authenticated eligible account and proof of its existing password. Normal backend authorization, suspension, campus policy, academic selection and Knoxite session issuance remain in force. The email/password fallback is preserved. No schema or database change was made during this 2026-11-13 review.

Only sign-in identity is requested; Drive, Gmail and Calendar access are unnecessary. Google sign-in does not alter assessment tiers or WRMR. The existing local implementation followed team authorization; this does not satisfy institutional activation gates. Keep `GOOGLE_SIGN_IN_ENABLED=false` until credentials, Workspace access, current college eligibility rules and the security/pilot approvals in `GOOGLE_SIGN_IN.md` are confirmed. No production configuration was accessed or changed.
