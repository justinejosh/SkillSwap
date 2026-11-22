import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import LegalNoticeContent from "@/app/components/LegalNoticeContent";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Only known local contexts; direct visits return to signup, not dashboard.
  const requested = location.state?.returnTo;
  const returnTo = ["/signup", "/login", "/profile", "/security"].includes(requested) ? requested : "/signup";
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-2xl space-y-4 pb-[env(safe-area-inset-bottom)]">
        <Button variant="outline" onClick={() => navigate(returnTo)} className="h-11 rounded-xl border-blue-100 text-blue-600 dark:border-slate-700 dark:text-blue-300">Back</Button>
        <article className="space-y-5 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-950">
          <h1 className="text-xl font-bold text-blue-900 dark:text-blue-100">Privacy and account information</h1>
          <LegalNoticeContent document="account" />
          <Link to="/security" className="inline-block text-sm font-semibold text-blue-600 underline dark:text-blue-400">Account security</Link>
        </article>
      </div>
    </main>
  );
}
