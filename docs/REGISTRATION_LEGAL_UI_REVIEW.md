# Registration and legal-information UI review

## Scope and approval boundary

Local frontend work only, `dev-justine`. No backend, notice configuration,
database, delivery, hosting or deployment changes. Existing uncommitted work
is preserved. The configured notice `2026-11-17-v1` is not changed or newly
certified by this work; registration still submits the server-provided version.

## Findings and safe corrections

- Email signup and Profile duplicated a four-section Terms/Privacy summary.
  Google onboarding linked away to `/privacy`, a different five-section document,
  losing the in-memory Google onboarding context.
- Signup's "I Understand & Agree" modal action checked consent. The shared
  reader now closes without modifying consent; only the checkbox and subsequent
  registration submission indicate acceptance.
- Old dialogs lacked focus trapping, accessible close labels and Escape handling.
  Existing Radix Dialog now provides these and restores focus. A fixed header and
  footer surround an independently scrollable body, bounded with dynamic viewport
  units and safe-area insets.
- Google and email registration use the same existing Input/Label treatment,
  rounded blue controls, full-width actions and explicit consent checkbox. Dark
  forms have readable surfaces; email identity wraps safely.
- Standalone `/privacy` uses the same preserved detailed document and compact
  typography. Direct visits return to signup; only known local return contexts
  are accepted. Registration opens in-place dialogs, preserving its form state.

## Shared rendering source, not a newly approved legal notice

`src/app/content/legal-notices.json` preserves both existing documents separately:
`summary` (four sections) and `account` (five sections). Paragraph/heading wording
is unchanged; JSX formatting whitespace is normalized. Both signup methods now
open the same summary for Terms and the same account information for Privacy.
Profile uses the same summary; `/privacy` uses the same account information.
No single reconciled approved policy is claimed or substituted.

`src/app/components/TermsModal.tsx` is an empty, unused file; left unchanged.
There is no standalone Terms route. Existing `/privacy` remains public.

## Human review required before legal-content finalization

| Issue | Preserved evidence | Proposed reconciliation for review (not applied) |
| --- | --- | --- |
| Third-party sharing | Summary section 3: information is "never sold or shared with outside commercial entities." Account information describes email delivery and Google identity processing. | Distinguish sale/unrelated commercial use from authorized service-provider processing; identify actual hosting, database, Google and email providers and their purposes. Team/privacy reviewer must approve exact wording. |
| Data inventory | Summary lists name, email and skills; detailed information also covers academics, assessments, agreements, sessions, messages, reviews and reports. | Approve a complete inventory and purpose statement; preserve portfolio visibility and private assessment-history distinctions. |
| Email delivery | Detailed document describes verification delivery, but does not explicitly describe password-recovery processing. | Review both delivery purposes and minimum transferred data before approving language. |
| Rights and retention | Detailed document points to study contacts and says retention arrangements and responsible contact must be supplied. No fixed retention period/contact is given. | Supply accountable contact, retention/deletion arrangements, request handling and third-party processing details. Do not invent these. |
| Assessment meaning | Detailed information lists badges and excluded private scores/history; it does not fully explain knowledge/scenario versus demonstrated practical proficiency. | Review whether the notice needs this distinction without claiming professional certification. |
| Version provenance | A configured notice version alone does not identify an archived approved text/hash in these components. | Provide exact approved document(s), version/hash and review decision. Compare the preserved texts with that archive. |

Any materially revised/reconciled wording requires a separately approved new
version, archived content and an explicit decision about which existing users
must accept it again. No version increment, re-consent enforcement or backfilled
consent is implemented. Do not reuse `2026-11-17-v1` for a materially new text.

## Changed files

- `src/app/components/GoogleSignIn.tsx`: signup styling and in-place legal reader.
- `src/app/pages/SignupPage.tsx`: shared reader, dark controls, explicit consent.
- `src/app/pages/ProfilePage.tsx`: removes duplicated legal markup.
- `src/app/pages/PrivacyPolicyPage.tsx`: shared text, compact styling, safe return.
- `src/app/content/legal-notices.json`: verbatim existing documents, kept separate.
- `src/app/components/LegalNoticeContent.tsx`: shared document renderer.
- `src/app/components/LegalNoticeDialog.tsx`: accessible mobile legal reader.
- `tests/browser/google-auth.spec.ts`: focused synthetic regressions.
- This report.

## Validation

- `npx playwright test tests/browser/google-auth.spec.ts`: **40 passed** across
  desktop/mobile projects (3.4 minutes).
- Two subsequently added tests, run with `--project=mobile --grep
  'registration legal final checks'`: **2 passed**. These verify email signup
  at all widths/themes, independent modal scrolling, visible header/footer,
  Escape/focus restoration, consent preservation, and Google loading/error states.
- Tested 320, 375, 390, 430 and 1280px; signup and login Google entry routes,
  both documents, both themes, long identity text, cancellation and state retention.
- Final `npm run typecheck` and `npm run build`: passed. Existing Vite >500 kB
  chunk advisory remains; no new dependency or bundling refactor was introduced.
- Compared shared headings/paragraphs with Git HEAD's signup, Profile and privacy
  documents: all match after whitespace normalization. No text omitted/reworded.
- Inspected 390px light/dark dialog screenshots: readable, fixed controls,
  scrollable body. `git diff --check` for affected files passes.

Browser tests mock Google and the API; no real accounts or protected databases
are used. Android behavior is Chromium touch emulation, not physical-device proof.
The native Android navigation bar/safe-area behavior still needs an owner device
check. No commits, pushes, deployment, hosted configuration changes or database
writes were performed.

## Follow-up: loading, Google availability and walkthrough (2026-11-21)

### Why staging differs

Anonymous, read-only checks of `https://knoxite.vercel.app/signup` found the older
"I Understand & Agree" modal in the deployed frontend bundle, without the shared
legal reader. Earlier selective releases did not include the local UI/legal work.
No deployment was performed here. The staging provider endpoint returned HTTP 200,
Google enabled and a client ID, but took approximately 16.6 seconds. This establishes
observed latency, not its hosting cause or a successful real Google login.

### Additional corrections

- Google provider discovery distinguishes loading, intentionally disabled and
  failed requests. A failed request offers Retry; a backend-disabled provider
  stays disabled. Password authentication remains available. No security gates
  or Google-token handling were weakened.
- Starting fresh Google onboarding clears the prior academic choices and consent
  checkbox after cancellation. No acceptance carries over to another identity.
- Shared page-specific skeletons replace text-only page loading. Dashboard,
  matches, skills, profile and chat retain their real header after authorization.
  Initial authentication uses only neutral decorative shapes. Existing persistent
  guards, role separation, expiry and account-switch handling are preserved.
- Skeletons use existing surfaces/radii and motion-safe pulses, without minimum
  display delays. Profile, chat and admin overview retain existing data during
  safe refetches; failed requests retain genuine error/retry states. Notifications
  now handles loading consistently across incoming, sent and history tabs.
- Driver.js native animation and smooth scrolling respect reduced motion. The
  spotlight duration is 300ms; the popover entry is 200ms. All seven steps and
  controls remain, with navigation locked during the native transition.

### Frontend files covered by the local changes

The legal-specific files are listed above. Additional changed files:

- `src/app/components/PageSkeleton.tsx` (new),
  `src/app/components/ui/skeleton.tsx`, `src/app/components/AuthGuard.tsx`.
- `src/app/components/GoogleSignIn.tsx`: provider recovery and fresh-consent reset.
- `src/app/pages/`: `DashboardPage.tsx`, `KnoxHubPage.tsx`, `MySkillsPage.tsx`,
  `ProfilePage.tsx`, `ChatPage.tsx`, `CommunityForumPage.tsx`, `PostDetailsPage.tsx`,
  `LeaderboardPage.tsx`, `SwapAgreementPage.tsx`, `SwapDetailsPage.tsx`,
  `CalendarPage.tsx`, `AchievementsPage.tsx`, `ActivityTimelinePage.tsx`,
  `PublicProfilePage.tsx`, `AssessmentPage.tsx`, `ReputationPage.tsx`,
  `NotificationPage.tsx`, `AdminDashboardPage.tsx`, `AssessmentAdminPage.tsx`,
  `IntegrityAdminPage.tsx`: loading presentation and preserved errors/shells.
- `src/app/components/admin/AdminWorkspaces.tsx`, `src/styles/admin.css`:
  inline skeletons and exclusion from generic status-message styling.
- `src/app/utils/useOnboardingTour.ts`, `src/styles/onboarding.css`: transitions.
- `tests/browser/loading-skeletons.spec.ts` (new), `google-auth.spec.ts`,
  `dashboard-onboarding.spec.ts`, `session-navigation.spec.ts`, `student-ui.spec.ts`,
  `workflows.spec.ts`: relevant regression coverage and updated loading assertions.

Earlier unrelated dirty files, backend/private provisioning work and existing
student/admin visual refinements remain preserved. Nothing is staged or committed.

### Fresh validation

- Broad frontend browser run: **348 passed, 6 failed**, 354 cases, no skipped or
  flaky cases. The failures were three obsolete assertions repeated on desktop
  and mobile: centered chat spinner versus header/skeleton, and two academic-error
  checks assuming there could be only one page alert.
- Updated those assertions to check the messages skeleton below the visible
  header, viewport containment, and the specific academic error. Registration
  remains disabled until valid options load; retry must preserve entered data.
  **All 6 affected cases then passed** in the targeted rerun. The broad suite was
  not rerun unnecessarily. No current failing case remains from that run.
- Covered slow APIs, exact rendered legal-text equality, provider retry/disabled
  states, cancelled onboarding consent, responsive light/dark screens, reduced
  motion, rapid tour navigation, revoked/expired sessions and account switching.
- Frontend TypeScript check and production build passed. The existing Vite
  >500 kB chunk advisory remains. `git diff --check` passes.

Inline operation feedback remains deliberately: college-options loading, Google
provider/challenge checking, verification/recovery submission and session-expiry
warnings. These are not full-page page-data placeholders.

The unresolved legal conflicts above still require human review; the notice
version and wording are unchanged. Tests use mocked Google/API fixtures and
Chromium mobile viewports/touch emulation, not physical Android or live-account
authentication. This work does not prove every UI defect absent. No backend,
database, authentication policy, hosting, commit, push or deployment change was
made for this frontend follow-up.
