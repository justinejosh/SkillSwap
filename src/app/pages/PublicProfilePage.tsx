import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "@/app/lib/api";
import {
  AssessmentBadge,
  AssessmentLegend,
  AssessmentTier,
} from "@/app/components/AssessmentBadge";
export interface PublicProfile {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  program: { id: string; label: string; code: string } | null;
  yearLevel: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  offeredSkills: {
    id: string;
    name: string;
    category: string;
    tier: AssessmentTier;
  }[];
  wantedSkills: { id: string; name: string; category: string }[];
  metrics: {
    averageRating: number | null;
    ratingCount: number;
    completedSwaps: number | null;
  };
}
export function PortfolioContent({ profile }: { profile: PublicProfile }) {
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-4">
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            referrerPolicy="no-referrer"
            alt=""
            className="size-20 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-20 items-center justify-center rounded-full bg-blue-100 text-3xl text-blue-800"
          >
            {profile.name[0]}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="mt-2 whitespace-pre-wrap break-words">
            {profile.bio || "No biography provided."}
          </p>
        </div>
      </div>
      <p className="text-sm">
        OLFU Santa Rosa · College ·{" "}
        {profile.program?.label || "Program not provided"} ·{" "}
        {profile.yearLevel?.name || "Year level not provided"}
        {profile.department
          ? ` · ${profile.department.name}`
          : " · Department unavailable"}
      </p>
      <div className="flex flex-wrap gap-5 text-sm">
        <p>
          {profile.metrics.averageRating === null
            ? "No reviews yet"
            : `${profile.metrics.averageRating.toFixed(1)}/5 from ${profile.metrics.ratingCount} validated review${profile.metrics.ratingCount === 1 ? "" : "s"}`}
        </p>
        <p>
          {profile.metrics.completedSwaps === null
            ? "Completed swap total awaiting historical validation"
            : `${profile.metrics.completedSwaps} completed swaps`}
        </p>
      </div>
      <section aria-labelledby="teaching-heading">
        <h2 id="teaching-heading" className="mb-3 text-xl font-semibold">
          Skills offered to teach ({profile.offeredSkills.length})
        </h2>
        {!profile.offeredSkills.length ? (
          <p>No teaching skills listed.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {profile.offeredSkills.map((skill) => (
              <li
                key={skill.id}
                className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <p className="break-words font-semibold capitalize">
                  {skill.name}
                </p>
                <p className="text-xs capitalize text-slate-500 dark:text-slate-300">
                  {skill.category}
                </p>
                <AssessmentBadge tier={skill.tier} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="learning-heading">
        <h2 id="learning-heading" className="mb-3 text-xl font-semibold">
          Skills wanted to learn ({profile.wantedSkills.length})
        </h2>
        {!profile.wantedSkills.length ? (
          <p>No learning goals listed.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {profile.wantedSkills.map((skill) => (
              <li
                key={skill.id}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
              >
                <p className="break-words font-semibold capitalize">
                  {skill.name}
                </p>
                <p className="text-xs capitalize text-slate-500 dark:text-slate-300">
                  {skill.category}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <AssessmentLegend />
    </div>
  );
}
export default function PublicProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setProfile(null);
    setError("");
    api<PublicProfile>(`/users/${userId}/profile`)
      .then((p) => {
        if (live) setProfile(p);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [userId]);
  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link
          to="/knox-hub"
          className="inline-block text-blue-700 underline dark:text-blue-300"
        >
          Back to KnoxHub
        </Link>
        <div className="rounded-2xl border bg-white p-5 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          {error ? (
            <p role="alert">{error}</p>
          ) : profile ? (
            <PortfolioContent profile={profile} />
          ) : (
            <p role="status">Loading student portfolio...</p>
          )}
        </div>
        {profile && (
          <Link
            to={`/report?userId=${encodeURIComponent(profile.id)}`}
            className="inline-block text-sm text-red-700 underline dark:text-red-300"
          >
            Report a concern about this student
          </Link>
        )}
      </div>
    </main>
  );
}
