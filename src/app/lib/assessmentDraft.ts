// Only unsent option IDs, scoped to the current student/attempt in this tab.
// No questions, grading keys, scores, credentials or extended deadlines.
const prefix = "knoxite-assessment-draft:";
function key(id: string) {
  const user = JSON.parse(localStorage.getItem("knoxite_user") || "{}");
  return user.id ? `${prefix}${user.id}:${id}` : null;
}
interface DraftAttempt {
  id: string; status: string; expiresAt: string;
  questions: Array<{ id: string; options: Array<{ id: string }> }>;
}
export function restoreAssessmentDraft(attempt: DraftAttempt): Record<string, string> {
  try {
    const name = key(attempt.id); if (!name) return {};
    if (attempt.status !== "IN_PROGRESS" || Date.parse(attempt.expiresAt) <= Date.now()) {
      sessionStorage.removeItem(name); return {};
    }
    const saved = JSON.parse(sessionStorage.getItem(name) || "null");
    if (!saved || saved.expiresAt !== attempt.expiresAt) return {};
    return Object.fromEntries(attempt.questions.flatMap((q) =>
      q.options.some((o) => o.id === saved.answers?.[q.id]) ? [[q.id, saved.answers[q.id]]] : []));
  } catch { return {}; }
}
export function saveAssessmentDraft(attempt: DraftAttempt, answers: Record<string, string>) {
  try {
    const name = key(attempt.id); if (!name) return;
    if (attempt.status !== "IN_PROGRESS" || Date.parse(attempt.expiresAt) <= Date.now()) sessionStorage.removeItem(name);
    else sessionStorage.setItem(name, JSON.stringify({ expiresAt: attempt.expiresAt, answers }));
  } catch { /* A storage restriction never changes the server attempt. */ }
}
export function clearAssessmentDrafts() {
  try {
  for (let i = sessionStorage.length - 1; i >= 0; i--) {
    const name = sessionStorage.key(i); if (name?.startsWith(prefix)) sessionStorage.removeItem(name);
  }
  } catch { /* Storage can be unavailable; server logout must still complete. */ }
}
