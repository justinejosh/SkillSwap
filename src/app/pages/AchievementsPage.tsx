import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/app/lib/api";
import {
  AssessmentBadge,
  AssessmentLegend,
} from "@/app/components/AssessmentBadge";
export default function AchievementsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api("/analytics/me")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to="/dashboard"
          className="text-blue-700 underline dark:text-blue-300"
        >
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">
          Your learning and teaching progress
        </h1>
        {error && <p role="alert">{error}</p>}
        {data ? (
          <>
            <p>
              {data.metrics.completedSwaps === null
                ? "Completed swap total awaits historical validation."
                : `${data.metrics.completedSwaps} completed exchanges.`}{" "}
              {data.metrics.averageRating === null
                ? "No validated peer ratings yet."
                : `Average peer rating: ${data.metrics.averageRating.toFixed(1)}/5.`}
            </p>
            <ul className="space-y-3">
              {data.skills.map((s: any) => (
                <li
                  key={s.skill.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border p-4 dark:border-slate-700"
                >
                  <span className="capitalize">{s.skill.name}</span>
                  <AssessmentBadge tier={s.tier} />
                  {s.tierAwardedAt && (
                    <span className="text-sm">
                      Earned {new Date(s.tierAwardedAt).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <AssessmentLegend />
            <Link
              to="/my-skills"
              className="inline-block text-blue-700 underline dark:text-blue-300"
            >
              Manage skills and assessments
            </Link>
          </>
        ) : (
          !error && <p role="status">Loading progress...</p>
        )}
      </div>
    </main>
  );
}
