import { LoadingContent } from "@/app/components/PageSkeleton";
import { AdvancedAssessmentScope } from "@/app/components/AdvancedAssessmentScope";
import { FormEvent, useContext, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, ApiError } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import {
  AssessmentBadge,
  AssessmentLegend,
  AssessmentTier,
} from "@/app/components/AssessmentBadge";
import { AssessmentPrompt } from "@/app/components/AssessmentPrompt";
import { restoreAssessmentDraft, saveAssessmentDraft } from "@/app/lib/assessmentDraft";
import { SessionTimeoutContext } from "@/app/components/SessionGuardian";
type Level = "BASIC" | "ADVANCED";
interface Availability {
  offeringId: string;
  isActive?: boolean;
  skillName: string;
  tier: AssessmentTier;
  levels: {
    level: Level;
    supported: boolean;
    eligible: boolean;
    reason: string;
    activeAttemptId: string | null;
    nextEligibleAt: string | null;
    passingPercent: number | null;
    questionCount: number | null;
    learningOutcomes: string | null;
    attemptCount: number;
  }[];
  attempts: {
    id: string;
    level: Level;
    status: string;
    attemptNumber: number;
    earnedPoints: number | null;
    possiblePoints: number | null;
    startedAt: string;
  }[];
}
interface Attempt {
  id: string;
  offeringActive?: boolean;
  offeringId: string;
  skillName: string;
  level: Level;
  tier: AssessmentTier;
  status: string;
  assessmentVersion: number;
  learningOutcomes: string;
  passingPercent: number;
  expiresAt: string;
  earnedPoints: number | null;
  possiblePoints: number | null;
  score: number | null;
  advancedPromptDismissed: boolean;
  questions: {
    id: string;
    prompt: string;
    points: number;
    kind: string;
    options: { id: string; text: string }[];
  }[];
}
export default function AssessmentPage() {
  const sessionPolicyActive = useContext(SessionTimeoutContext);
  const { offeringId, attemptId } = useParams();
  const navigate = useNavigate();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [advancedPrompt, setAdvancedPrompt] = useState(false);
  useEffect(() => {
    if (sessionPolicyActive && attempt) saveAssessmentDraft(attempt, answers);
  }, [sessionPolicyActive, attempt, answers]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setAttempt(null);
    setAvailability(null);
    setAnswers({});
    setAdvancedPrompt(false);
    const load = async () => {
      if (attemptId) {
        const a = await api<Attempt>(`/assessments/attempts/${attemptId}`);
        if (!live) return;
        setAttempt(a);
        setAnswers(restoreAssessmentDraft(a));
        const info = await api<Availability>(
          `/assessments/offerings/${a.offeringId}`,
        );
        if (!live) return;
        setAvailability(info);
        setAdvancedPrompt(
          a.status === "PASSED" &&
            a.level === "BASIC" &&
            a.tier === "AMATEUR" &&
            !a.advancedPromptDismissed &&
            info.levels.some((l) => l.level === "ADVANCED" && l.supported),
        );
      } else if (offeringId) {
        const info = await api<Availability>(
          `/assessments/offerings/${offeringId}`,
        );
        if (live) setAvailability(info);
      }
    };
    void load()
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [offeringId, attemptId]);
  function showError(e: any) {
    setError(
      e.message +
        (e instanceof ApiError && e.details?.nextEligibleAt
          ? ` Next eligible: ${new Date(e.details.nextEligibleAt).toLocaleString()}.`
          : ""),
    );
  }
  async function start(level: Level) {
    setBusy(true);
    setError("");
    try {
      const a = await api<Attempt>(
        `/assessments/offerings/${offeringId || attempt?.offeringId}/attempts`,
        { method: "POST", body: JSON.stringify({ level }) },
      );
      navigate(`/assessments/${a.id}`);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!attempt) return;
    const missing = attempt.questions.length - Object.keys(answers).length;
    if (
      !window.confirm(
        missing
          ? `${missing} unanswered question(s) will receive zero points. Submit this attempt?`
          : "Submit your assessment for final grading?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await api<Attempt>(
        `/assessments/attempts/${attempt.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            answers: Object.entries(answers).map(([questionId, optionId]) => ({
              questionId,
              optionId,
            })),
          }),
        },
      );
      setAttempt(result);
      saveAssessmentDraft(result, {});
      const info = await api<Availability>(
        `/assessments/offerings/${result.offeringId}`,
      );
      setAvailability(info);
      setAdvancedPrompt(
        result.status === "PASSED" &&
          result.level === "BASIC" &&
          result.tier === "AMATEUR" &&
          !result.advancedPromptDismissed &&
          info.levels.some((l) => l.level === "ADVANCED" && l.supported),
      );
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }
  const remaining = attempt
    ? Math.max(
        0,
        Math.ceil((new Date(attempt.expiresAt).getTime() - now) / 1000),
      )
    : 0;
  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          to="/my-skills"
          className="text-blue-700 underline dark:text-blue-300"
        >
          Back to My Skills
        </Link>
        <div className="space-y-6 rounded-2xl border bg-white p-5 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-2xl font-bold capitalize">
            {attempt?.skillName ||
              availability?.skillName ||
              "Skill assessment"}
          </h1>
          {error && (
            <p
              role="alert"
              className="rounded border border-red-300 p-3 text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          )}
          {loading && <LoadingContent layout="form" label="Loading assessment..." />}
          {(attempt || availability) && (
            <AssessmentBadge tier={attempt?.tier || availability!.tier} />
          )}
          {(attempt?.offeringActive === false || availability?.isActive === false) && (
            <p role="status">This teaching skill was removed. Your history and earned tier are retained. Restore the skill in My Skills before continuing an assessment.</p>
          )}
          {attempt?.level === "ADVANCED" && <AdvancedAssessmentScope />}
          {attempt?.learningOutcomes && (
            <p className="whitespace-pre-wrap text-sm">
              <strong>
                Learning outcomes for version {attempt.assessmentVersion}:
              </strong>{" "}
              {attempt.learningOutcomes}
            </p>
          )}
          {attempt ? (
            attempt.status === "IN_PROGRESS" ? (
              <form onSubmit={submit} className="space-y-7">
                <p>
                  {attempt.level === "BASIC"
                    ? "Basic knowledge assessment"
                    : "Advanced applied assessment"}{" "}
                  · Version {attempt.assessmentVersion} · Passing threshold{" "}
                  {attempt.passingPercent}%
                </p>
                <p role="timer" aria-label="Time remaining">
                  Time remaining: {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, "0")}
                </p>
                {!remaining && (
                  <p role="alert">
                    This attempt has expired. Refresh to view your retake
                    eligibility.
                  </p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Starting an attempt counts toward the retake limit. Refreshing
                  keeps the same questions and deadline; unsent answer selections {sessionPolicyActive
                    ? "are saved in this tab until the attempt expires or you log out."
                    : "may need to be selected again."}
                </p>
                {attempt.questions.map((q, index) => (
                  <fieldset
                    key={q.id}
                    disabled={busy || !remaining || attempt.offeringActive === false}
                    className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <legend className="max-w-full whitespace-pre-wrap break-words px-1 font-semibold">
                      {index + 1}. {q.prompt}
                    </legend>
                    {q.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 focus-within:ring-2 focus-within:ring-blue-600 dark:border-slate-700"
                      >
                        <input
                          className="mt-1"
                          type="radio"
                          name={q.id}
                          value={option.id}
                          checked={answers[q.id] === option.id}
                          onChange={() => setAnswers((a) => {
                            const next = { ...a, [q.id]: option.id };
                            if (sessionPolicyActive) saveAssessmentDraft(attempt, next);
                            return next;
                          })}
                        />
                        <span className="whitespace-pre-wrap break-words">
                          {option.text}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ))}
                <Button type="submit" disabled={busy || !remaining || attempt.offeringActive === false}>
                  {busy ? "Submitting..." : "Submit Assessment"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4" role="status">
                <h2 className="text-xl font-semibold">
                  {attempt.status === "PASSED"
                    ? "Assessment Passed"
                    : attempt.status === "EXPIRED"
                      ? "Attempt expired"
                      : "Passing threshold not reached"}
                </h2>
                {attempt.score !== null && (
                  <p>
                    {attempt.earnedPoints}/{attempt.possiblePoints} points (
                    {attempt.score.toFixed(1)}%). Passing threshold:{" "}
                    {attempt.passingPercent}%.
                  </p>
                )}
                <p>
                  Your current skill tier is{" "}
                  {attempt.tier === "NOT_ASSESSED"
                    ? "Not Assessed"
                    : attempt.tier === "AMATEUR"
                      ? "Amateur"
                      : "Verified"}
                  . Previously earned tiers are preserved.
                </p>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(`/assessments/offerings/${attempt.offeringId}`)
                  }
                >
                  View assessment eligibility and history
                </Button>
              </div>
            )
          ) : (
            availability && (
              <>
                <p className="text-sm">
                  Up to three starts per skill and level in seven days. Failed
                  or expired attempts have a 24-hour cooldown. Removing a skill
                  does not reset attempts.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {availability.levels.map((level) => (
                    <section
                      key={level.level}
                      className="space-y-3 rounded-xl border p-4 dark:border-slate-700"
                    >
                      <h2 className="font-bold">
                        {level.level === "BASIC"
                          ? "Basic → Amateur"
                          : "Advanced → Verified"}
                      </h2>
                      {level.level === "ADVANCED" && (
                        <AdvancedAssessmentScope />
                      )}
                      <p>{level.reason}</p>
                      {level.learningOutcomes && (
                        <p className="whitespace-pre-wrap text-sm">
                          <strong>Learning outcomes:</strong>{" "}
                          {level.learningOutcomes}
                        </p>
                      )}
                      {level.passingPercent !== null && (
                        <p className="text-sm">
                          Passing threshold: {level.passingPercent}% ·{" "}
                          {level.questionCount} items
                        </p>
                      )}
                      {level.nextEligibleAt && (
                        <p className="text-sm">
                          Next eligible:{" "}
                          {new Date(level.nextEligibleAt).toLocaleString()}
                        </p>
                      )}
                      <Button
                        disabled={!level.eligible || busy}
                        onClick={() => void start(level.level)}
                      >
                        {level.activeAttemptId
                          ? "Resume Assessment"
                          : level.level === "BASIC"
                            ? "Take Basic Assessment"
                            : "Take Advanced Assessment"}
                      </Button>
                    </section>
                  ))}
                </div>
                <section>
                  <h2 className="mb-3 text-lg font-bold">
                    Your assessment history
                  </h2>
                  {!availability.attempts.length ? (
                    <p>No attempts yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {availability.attempts.map((a) => (
                        <li key={a.id}>
                          <Link
                            className="text-blue-700 underline dark:text-blue-300"
                            to={`/assessments/${a.id}`}
                          >
                            {a.level} attempt {a.attemptNumber}:{" "}
                            {a.status.replaceAll("_", " ")}
                          </Link>
                          <span className="ml-2 text-sm">
                            {new Date(a.startedAt).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )
          )}
          <AssessmentLegend />
        </div>
        {advancedPrompt && attempt && (
          <AssessmentPrompt
            offeringId={attempt.offeringId}
            level="ADVANCED"
            onClose={() => setAdvancedPrompt(false)}
          />
        )}
      </div>
    </main>
  );
}
