import { Link } from "react-router";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to="/dashboard"
          className="text-blue-700 underline dark:text-blue-300"
        >
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Privacy and account information</h1>
        <section className="space-y-2 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Your student portfolio</h2>
          <p>
            Other eligible, signed-in students can view your display name,
            avatar, biography, academic program and year, offered and wanted
            skills, assessment badges, and available peer ratings and swap
            totals. Include only information you are comfortable sharing with
            them.
          </p>
          <p>
            Your email address, password, sign-in credentials, assessment
            answers, scores, and private attempt history are excluded from
            student portfolios.
          </p>
        </section>
        <section className="space-y-2 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">
            Information used for exchanges
          </h2>
          <p>
            Knoxite stores your account and academic selections, skill
            associations, assessment records, swap requests and agreements,
            session records, reviews, messages, and submitted reports. These
            support reciprocal matching, exchanges, progress tracking, and
            account protection.
          </p>
          <p>
            Swap conversations and session details are available to the
            participants. Administrators can access account-management
            information and reports needed for moderation. An email-delivery
            service receives the address and verification link needed to send
            your verification message.
          </p>
        </section>
        <section className="space-y-2 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">
            Institutional Google sign-in
          </h2>
          <p>
            When enabled by the project team under approved institutional rules,
            Google sign-in shares identity information needed to authenticate
            you. Knoxite stores your linked Google account identifier, verified
            institutional email, Workspace domain, and verification dates
            privately. Google sign-in does not give Knoxite access to your Gmail
            messages or Drive files.
          </p>
          <p>
            Linking Google preserves your Knoxite profile and exchange history.
            You can manage the link in Account security. Set up a verified
            email/password fallback before unlinking your only sign-in method.
          </p>
        </section>
        <section className="space-y-2 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">Protecting your account</h2>
          <p>
            Your sign-in session is stored in this browser. Sign out on shared
            devices. You can review active sessions and change your password on
            the account security page. A password change signs out existing
            sessions.
          </p>
          <Link
            to="/security"
            className="text-blue-700 underline dark:text-blue-300"
          >
            Account security
          </Link>
        </section>
        <section className="space-y-2 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold">
            Corrections and privacy requests
          </h2>
          <p>
            You can edit your profile and skills in the application. For other
            requests, contact the Knoxite project team through the contact
            details provided for your student study. Account deletion and data
            export are not currently self-service features.
          </p>
          <p>
            Removing an offered skill preserves earned tiers and assessment
            history. Cancelling an exchange or suspending an account preserves
            historical records. The project team must provide the approved study
            privacy notice, retention arrangements, and responsible contact
            before collecting student study data.
          </p>
        </section>
      </div>
    </main>
  );
}
