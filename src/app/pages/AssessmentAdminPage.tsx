import { AdvancedAssessmentScope } from "@/app/components/AdvancedAssessmentScope";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
const blank = {
  skillId: "",
  level: "BASIC",
  title: "",
  learningOutcomes: "",
  questionCount: 10,
  passingPercent: 80,
  durationMinutes: 20,
  items: [],
};
export default function AssessmentAdminPage() {
  const [academicData, setAcademicData] = useState<{
    programs: any[];
    departments: any[];
    yearLevels: any[];
  }>({ programs: [], departments: [], yearLevels: [] });
  const [mapping, setMapping] = useState({
    programId: "",
    departmentId: "",
    validationNotes: "",
    officiallyConfirmed: false,
  });
  const [yearProgram, setYearProgram] = useState({
    programId: "",
    yearLevelIds: [] as string[],
  });
  const [banks, setBanks] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [json, setJson] = useState(JSON.stringify(blank, null, 2));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [academic, setAcademic] = useState({
    type: "department",
    code: "",
    name: "",
    order: 1,
  });
  async function load() {
    const [b, s, r, a] = await Promise.all([
      api("/admin/assessments"),
      api("/admin/assessment-catalog"),
      api("/admin/reports"),
      api("/admin/academic-programs"),
    ]);
    setBanks(b);
    setSkills(s);
    setReports(r);
    setAcademicData(a);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function action(work: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(message);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function importBank(e: FormEvent) {
    e.preventDefault();
    void action(
      () =>
        api("/admin/assessments/versions", {
          method: "POST",
          body: JSON.stringify(JSON.parse(json)),
        }),
      "Draft imported. It is unavailable to students until validated and published.",
    );
  }
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900";
  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-5xl space-y-7">
        <Link
          to="/admin-dashboard"
          className="text-blue-700 underline dark:text-blue-300"
        >
          Back to Admin Dashboard
        </Link>
        <h1 className="text-2xl font-bold">
          Assessment and trust administration
        </h1>
        {error && (
          <p
            role="alert"
            className="rounded border border-red-400 p-3 text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded border p-3">
            {notice}
          </p>
        )}
        <section className="space-y-4 rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <AdvancedAssessmentScope />
          <h2 className="text-xl font-semibold">
            Import a curated question bank
          </h2>
          <p className="text-sm">
            Basic versions use 10 equally weighted multiple-choice questions.
            Advanced versions use 5–10 applied scenario choices with predefined
            rubrics. The default threshold is 80%. Published versions are
            immutable; import another version to revise content or thresholds.
            No arbitrary questions are generated.
          </p>
          <details>
            <summary className="cursor-pointer font-semibold">
              Catalogue IDs and item format
            </summary>
            <ul className="my-3 text-sm">
              {skills.map((s) => (
                <li key={s.id}>
                  <span className="capitalize">{s.name}</span>:{" "}
                  <code className="break-all">{s.id}</code>
                </li>
              ))}
            </ul>
            <p className="text-sm">
              Each item contains kind (MULTIPLE_CHOICE for basic, APPLIED_CHOICE
              for advanced), prompt, competency, rubric, points, and options.
              Each option contains text and isCorrect. Exactly one option is
              correct. Advanced items must evaluate applied competency; a human
              validator must verify this before publishing.
            </p>
          </details>
          <form onSubmit={importBank} className="space-y-3">
            <label htmlFor="bank-json" className="block font-semibold">
              Question bank JSON
            </label>
            <textarea
              id="bank-json"
              className={`${inputClass} min-h-72 font-mono text-sm`}
              value={json}
              onChange={(e) => setJson(e.target.value)}
              spellCheck={false}
            />
            <Button disabled={busy}>Import Draft</Button>
          </form>
        </section>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Banks and versions</h2>
          {!banks.length && (
            <p>
              No question banks. Assessments remain unavailable until content is
              validated and published.
            </p>
          )}
          {banks.map((bank) => (
            <article
              key={bank.id}
              className="space-y-4 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
            >
              <h3 className="font-bold capitalize">
                {bank.skill.name} · {bank.level}
              </h3>
              {bank.versions.map((v: any) => (
                <div
                  key={v.id}
                  className="space-y-3 border-t pt-4 dark:border-slate-700"
                >
                  <p>
                    Version {v.version}: {v.status} · {v.questionCount} items ·
                    Pass {v.passingPercent}% · {v._count.attempts} attempts
                  </p>
                  <p className="whitespace-pre-wrap text-sm">
                    Learning outcomes: {v.learningOutcomes}
                  </p>
                  <details>
                    <summary className="cursor-pointer text-blue-700 dark:text-blue-300">
                      Inspect private questions and grading
                    </summary>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">
                      {JSON.stringify(v.items, null, 2)}
                    </pre>
                  </details>
                  {v.status === "DRAFT" && (
                    <>
                      <label
                        className="block text-sm"
                        htmlFor={`notes-${v.id}`}
                      >
                        Validation notes: competency coverage, correctness,
                        applied format, and grading fairness
                      </label>
                      <textarea
                        id={`notes-${v.id}`}
                        className={inputClass}
                        value={notes[v.id] || ""}
                        onChange={(e) =>
                          setNotes((n) => ({ ...n, [v.id]: e.target.value }))
                        }
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button
                          disabled={busy || !notes[v.id]?.trim()}
                          variant="outline"
                          onClick={() =>
                            void action(
                              () =>
                                api(
                                  `/admin/assessments/versions/${v.id}/validate`,
                                  {
                                    method: "POST",
                                    body: JSON.stringify({
                                      validationNotes: notes[v.id],
                                    }),
                                  },
                                ),
                              "Human validation recorded.",
                            )
                          }
                        >
                          Record Human Validation
                        </Button>
                        <Button
                          disabled={busy || !v.validatedAt}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Publish this reviewed version for students? Existing attempts retain their previous version.",
                              )
                            )
                              void action(
                                () =>
                                  api(
                                    `/admin/assessments/versions/${v.id}/publish`,
                                    { method: "POST", body: "{}" },
                                  ),
                                "Version published.",
                              );
                          }}
                        >
                          Publish Version
                        </Button>
                      </div>
                    </>
                  )}
                  {v.status === "PUBLISHED" && (
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() =>
                        void action(
                          () =>
                            api(`/admin/assessments/versions/${v.id}/retire`, {
                              method: "POST",
                              body: "{}",
                            }),
                          "Version retired for new attempts.",
                        )
                      }
                    >
                      Retire Version
                    </Button>
                  )}
                  {v.validationNotes && (
                    <p className="text-sm">Validation: {v.validationNotes}</p>
                  )}
                </div>
              ))}
            </article>
          ))}
        </section>
        <section className="space-y-4 rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">Official academic options</h2>
          <p className="text-sm">
            Use the institution's approved department and year-level names and
            stable codes. Empty lists remain unavailable rather than receiving
            guessed values.
          </p>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void action(
                () =>
                  api("/admin/academic-options", {
                    method: "POST",
                    body: JSON.stringify(academic),
                  }),
                "Academic option added.",
              );
            }}
          >
            <label>
              Option type
              <select
                className={inputClass}
                value={academic.type}
                onChange={(e) =>
                  setAcademic((a) => ({ ...a, type: e.target.value }))
                }
              >
                <option value="department">Department</option>
                <option value="yearLevel">Year level</option>
              </select>
            </label>
            <label>
              Official code
              <input
                required
                className={inputClass}
                value={academic.code}
                onChange={(e) =>
                  setAcademic((a) => ({ ...a, code: e.target.value }))
                }
              />
            </label>
            <label>
              Official name
              <input
                required
                className={inputClass}
                value={academic.name}
                onChange={(e) =>
                  setAcademic((a) => ({ ...a, name: e.target.value }))
                }
              />
            </label>
            {academic.type === "yearLevel" && (
              <label>
                Display order
                <input
                  required
                  min={1}
                  max={100}
                  type="number"
                  className={inputClass}
                  value={academic.order}
                  onChange={(e) =>
                    setAcademic((a) => ({
                      ...a,
                      order: Number(e.target.value),
                    }))
                  }
                />
              </label>
            )}
            <Button disabled={busy}>Add Official Option</Button>
          </form>
        </section>
        <section className="space-y-4 rounded-2xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-xl font-semibold">
            College programs and department mapping
          </h2>
          <Button
            disabled={busy}
            variant="outline"
            onClick={() =>
              void action(
                () =>
                  api("/admin/academic-options/initialize", {
                    method: "POST",
                    body: "{}",
                  }),
                "College program catalogue initialized. Existing records and department mappings were preserved.",
              )
            }
          >
            Initialize Team-Approved Programs
          </Button>
          <ul className="text-sm">
            {academicData.programs.map((p) => (
              <li key={p.id}>
                {p.label} · {p.yearLevels.map((y: any) => y.name).join(", ")} ·{" "}
                {p.mappingValidatedAt
                  ? p.department?.name
                  : "Department mapping pending"}
              </li>
            ))}
          </ul>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void action(
                () =>
                  api(
                    `/admin/academic-programs/${mapping.programId}/department`,
                    {
                      method: "POST",
                      body: JSON.stringify({
                        departmentId: mapping.departmentId,
                        validationNotes: mapping.validationNotes,
                        officiallyConfirmed: mapping.officiallyConfirmed,
                      }),
                    },
                  ),
                "Official mapping saved.",
              );
            }}
          >
            <label className="block">
              Program
              <select
                required
                className={inputClass}
                value={mapping.programId}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, programId: e.target.value }))
                }
              >
                <option value="">Select program</option>
                {academicData.programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Official department
              <select
                required
                className={inputClass}
                value={mapping.departmentId}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, departmentId: e.target.value }))
                }
              >
                <option value="">Select confirmed department</option>
                {academicData.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Official mapping evidence
              <textarea
                required
                className={inputClass}
                value={mapping.validationNotes}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, validationNotes: e.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                required
                type="checkbox"
                checked={mapping.officiallyConfirmed}
                onChange={(e) =>
                  setMapping((m) => ({
                    ...m,
                    officiallyConfirmed: e.target.checked,
                  }))
                }
              />
              I have confirmed this mapping with an official institutional
              source.
            </label>
            <Button disabled={busy}>Save Confirmed Mapping</Button>
          </form>
          <form
            className="space-y-3 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              void action(
                () =>
                  api(
                    `/admin/academic-programs/${yearProgram.programId}/year-levels`,
                    {
                      method: "PATCH",
                      body: JSON.stringify({
                        yearLevelIds: yearProgram.yearLevelIds,
                      }),
                    },
                  ),
                "Program year levels updated.",
              );
            }}
          >
            <label className="block">
              Configure year levels for a program
              <select
                required
                className={inputClass}
                value={yearProgram.programId}
                onChange={(e) => {
                  const p = academicData.programs.find(
                    (p) => p.id === e.target.value,
                  );
                  setYearProgram({
                    programId: e.target.value,
                    yearLevelIds: p?.yearLevels.map((y: any) => y.id) || [],
                  });
                }}
              >
                <option value="">Select program</option>
                {academicData.programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-4">
              {academicData.yearLevels.map((y) => (
                <label key={y.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={yearProgram.yearLevelIds.includes(y.id)}
                    onChange={(e) =>
                      setYearProgram((p) => ({
                        ...p,
                        yearLevelIds: e.target.checked
                          ? [...p.yearLevelIds, y.id]
                          : p.yearLevelIds.filter((id) => id !== y.id),
                      }))
                    }
                  />
                  {y.name}
                </label>
              ))}
            </div>
            <Button disabled={busy}>Save Program Year Levels</Button>
          </form>
        </section>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Student reports</h2>
          {!reports.length && <p>No reports.</p>}
          {reports.map((r) => (
            <article
              key={r.id}
              className="space-y-3 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
            >
              <p>
                {r.reporter.name} reported{" "}
                <Link
                  className="text-blue-700 underline"
                  to={`/students/${r.target.id}`}
                >
                  {r.target.name}
                </Link>
                : {r.reason} · {r.status}
              </p>
              <p className="whitespace-pre-wrap">{r.description}</p>
              {r.status === "PENDING" && (
                <>
                  <label className="block" htmlFor={`report-${r.id}`}>
                    Resolution notes
                  </label>
                  <textarea
                    id={`report-${r.id}`}
                    className={inputClass}
                    value={notes[r.id] || ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [r.id]: e.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-3">
                    {["RESOLVED", "DISMISSED"].map((status) => (
                      <Button
                        key={status}
                        disabled={busy || !notes[r.id]?.trim()}
                        variant="outline"
                        onClick={() =>
                          void action(
                            () =>
                              api(`/admin/reports/${r.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({
                                  status,
                                  resolution: notes[r.id],
                                }),
                              }),
                            "Report updated.",
                          )
                        }
                      >
                        {status === "RESOLVED" ? "Resolve" : "Dismiss"}
                      </Button>
                    ))}
                    <Button
                      disabled={busy}
                      variant="destructive"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Suspend this student's access while retaining their records?",
                          )
                        )
                          void action(
                            () =>
                              api(`/admin/users/${r.target.id}`, {
                                method: "DELETE",
                              }),
                            "Student suspended.",
                          );
                      }}
                    >
                      Suspend Student
                    </Button>
                  </div>
                </>
              )}
              {r.resolution && <p>Resolution: {r.resolution}</p>}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
