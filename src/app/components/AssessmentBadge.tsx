import { CheckCircle2 } from "lucide-react";
export type AssessmentTier = "NOT_ASSESSED" | "AMATEUR" | "VERIFIED";
export const badgeDescriptions = {
  NOT_ASSESSED:
    "Not Assessed: no passing Knoxite basic assessment. This student can still teach and swap.",
  AMATEUR: "Amateur: passed Knoxite's basic assessment for this skill.",
  VERIFIED:
    "Verified: passed Knoxite's advanced scenario-based assessment for this skill. This is not an observed practical test or professional certification.",
};
export function AssessmentBadge({
  tier = "NOT_ASSESSED",
}: {
  tier?: AssessmentTier;
}) {
  const color =
    tier === "VERIFIED"
      ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200"
      : tier === "AMATEUR"
        ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-200"
        : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200";
  return (
    <span
      title={badgeDescriptions[tier]}
      aria-label={badgeDescriptions[tier]}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${color}`}
    >
      {tier === "VERIFIED" && (
        <CheckCircle2 aria-hidden="true" className="size-3" />
      )}
      {tier === "NOT_ASSESSED"
        ? "Not Assessed"
        : tier === "AMATEUR"
          ? "Amateur"
          : "Verified"}
    </span>
  );
}
export function AssessmentLegend() {
  return (
    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      Not Assessed means no passing basic result. Amateur means a basic
      assessment was passed. Verified means Knoxite's advanced scenario-based
      assessment was passed. Advanced assessments currently measure reasoning
      about applied situations, not writing and running a program or observed
      hands-on performance. Badges apply to individual skills and are not
      professional certifications.
    </p>
  );
}
