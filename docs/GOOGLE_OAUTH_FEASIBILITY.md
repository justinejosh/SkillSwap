# Optional Google sign-in: feasibility review

Status: evaluated as an optional future method; **not implemented**. Secure institutional email verification remains the fallback.

Google Identity Services can fit the React/Express architecture without replacing Knoxite's local users, roles, or sessions. Feasibility depends on OLFU confirming that its institutional student accounts support the chosen Google identity flow and permit the application. No claim is made that the proposed `lag` suffix is an official campus identifier.

Google requires a configured web client ID, application branding, authorized origins, and applicable redirect configuration. See [Google's setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

A future backend must verify Google's signature, audience, issuer, expiry, CSRF/nonce protections appropriate to the chosen flow, and the institution-approved hosted-domain claim. Use Google's stable `sub` identifier for the provider account; an email suffix alone is insufficient. Google distinguishes Workspace ownership evidence (`email_verified` plus `hd`) from third-party Google accounts whose email ownership may need a separate challenge. See [Google's server verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## Institutional questions before approval

1. Are college student accounts Google Workspace accounts, and which hosted-domain claim values are legitimate? Do not infer this list from the visible email domain.
2. Does institutional IT allow this application and the intended account population? Who owns the Cloud project, credentials, consent configuration, and recovery process?
3. Is `@student.fatima.edu.ph` authoritative for the intended population, and does `lag` uniquely and reliably identify Santa Rosa/Laguna students?
4. How will college enrollment be established and maintained? Neither choosing a college program nor proving mailbox ownership necessarily proves current enrollment.
5. Which development and production origins/redirects will be approved, and who handles privacy notices and account lifecycle changes?

## Proposed architecture after separate approval

Add an identity relation keyed uniquely by `(provider, providerSubject)` and map it to an existing local User. Keep authorization, suspension, campus policy, academic selection, and Knoxite session issuance in the backend. Account linking should require proof of the existing account rather than automatically merging by an email string. Preserve the email-verification/password fallback and account-recovery policy.

Request identity scopes only for sign-in; access to Drive, Gmail, Calendar, or other institutional data is unnecessary. Google sign-in must not alter assessment tiers or WRMR. Do not add Google endpoints, libraries, credentials, or production configuration until the institution and team approve the design.
