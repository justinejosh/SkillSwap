import { Plus, BookOpen, ChevronDown } from "lucide-react";
import { descendingAcademicYears } from "@/app/lib/academicDisplay";
import { AssessmentSkillPicker } from "@/app/components/admin/AssessmentSkillPicker";
import { LoadingContent } from "@/app/components/PageSkeleton";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AssessmentDirectory } from "@/app/components/admin/AssessmentDirectory";
import { AdminReports } from "@/app/components/admin/AdminReports";
import { AdminConfirm, AdminStatus } from "@/app/components/admin/AdminUI";
import { AdvancedAssessmentScope } from "@/app/components/AdvancedAssessmentScope";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
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
type Panel = "option" | "mappings" | "department" | "years" | "guide" | "advanced";
export default function AssessmentAdminPage() {
  const [panels,setPanels]=useState<Record<Panel,boolean>>({option:false,mappings:false,department:false,years:false,guide:false,advanced:false});
  const panelRefs=useRef<Partial<Record<Panel,HTMLButtonElement|null>>>({});
  function toggle(name:Panel){setPanels(old=>({...old,[name]:!old[name]}));}
  function close(name:Panel){setPanels(old=>({...old,[name]:false}));panelRefs.current[name]?.focus();}
  function panelButton(name:Panel,label:string,primary=false){return <Button type="button" size="sm" variant={primary?"default":"outline"} ref={node=>{panelRefs.current[name]=node;}} aria-expanded={panels[name]} aria-controls={`admin-${name}-panel`} className={`h-auto min-h-9 w-fit max-w-full whitespace-normal text-left ${primary?"bg-blue-600 text-white hover:bg-blue-700":""}`} onClick={()=>toggle(name)}>{name==="option"?<Plus className="size-4" aria-hidden="true"/>:name==="guide"?<BookOpen className="size-4" aria-hidden="true"/>:name==="advanced"?<ChevronDown className="size-4" aria-hidden="true"/>:null}{label}</Button>;}
  function closeButton(name:Panel,label:string){return <Button type="button" size="sm" variant="ghost" aria-label={`Close ${label}`} onClick={()=>close(name)}>Close</Button>;}
  const [params]=useSearchParams();
  const section=["academic","reports","import"].includes(params.get("section")||"")?params.get("section")!:"directory";
  const [loading,setLoading]=useState(true),[ready,setReady]=useState(false),[importCandidate,setImportCandidate]=useState<any>(null),[programSearch,setProgramSearch]=useState("");
  const [selectedProgramId,setSelectedProgramId]=useState<string|null>(null);
  const loadSequence=useRef(0),actionLock=useRef(false);

  const [academicData, setAcademicData] = useState<{
    programs: any[];
    departments: any[];
    yearLevels: any[];
    provisionalDraft?: {
      source: string;
      departments: { code: string; name: string; programCodes: string[] }[];
    };
  }>({ programs: [], departments: [], yearLevels: [] });
  const selectedProgram=academicData.programs.find(p=>p.id===selectedProgramId);
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
    const seq=++loadSequence.current;setLoading(true);
    try {
      const result=await api(section==="directory"?"/admin/assessments":section==="import"?"/admin/assessment-catalog":section==="academic"?"/admin/academic-programs":"/admin/reports");
      if(seq!==loadSequence.current)return;
      setReady(true);setError("");
      if(section==="directory")setBanks(result);else if(section==="import")setSkills(result);else if(section==="academic")setAcademicData(result);else setReports(result);
    } finally {if(seq===loadSequence.current)setLoading(false);}
  }
  useEffect(()=>{setReady(false);setError("");setNotice("");void load().catch(e=>setError(e.message));return()=>{loadSequence.current++;};},[section]);
  async function action(work: () => Promise<unknown>, message: string) {
    if(actionLock.current)return;actionLock.current=true;
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
      setBusy(false);actionLock.current=false;
    }
  }
  function prepareImport() {
    try {const parsed=JSON.parse(json);if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Use a JSON object.");setImportCandidate(parsed);setError("");return true;}
    catch(e){setError(`Invalid question-bank JSON: ${e instanceof Error?e.message:"check its syntax"}`);return false;}
  }
  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900";
  return <AdminShell title={section==="academic"?"Academic Configuration":section==="reports"?"Reports":"Assessment Management"}>
    {["directory","import"].includes(section)&&<nav aria-label="Assessment workspace" className="admin-workspace-tabs flex flex-wrap gap-3 text-sm"><Link className="rounded-lg border border-blue-300 px-3 py-2 text-blue-700 dark:text-blue-300" aria-current={section==="directory"?"page":undefined} to="/admin/assessments">Assessment Questions</Link><Link className="rounded-lg border border-blue-300 px-3 py-2 text-blue-700 dark:text-blue-300" aria-current={section==="import"?"page":undefined} to="/admin/assessments?section=import">Add Assessment Questions</Link></nav>}
    {error&&<p role="alert" className="admin-error">{error}</p>}{notice&&<p role="status" className="admin-panel">{notice}</p>}
    {loading?<LoadingContent layout={section==="import"?"form":"table"} label="Loading administration records..." />:!ready?<Button variant="outline" onClick={()=>void load().catch(e=>setError(e.message))}>Retry loading records</Button>:<>
      {section==="directory"&&<AssessmentDirectory banks={banks} busy={busy} action={action}/>}
      {section==="import"&&(        <section className="admin-panel space-y-4">
          <AdvancedAssessmentScope />
          <h2 className="text-xl font-semibold">
            Add Assessment Questions
          </h2>
          <p className="text-sm">The preset catalog contains 80 skills. Adding the catalog creates no question banks, approvals or assessment tiers.</p>
          <AdminConfirm label="Set Up Skill Catalog" title="Initialize missing canonical skill records?" description="This idempotent setup adds or reuses canonical skills. It does not create banks, review approvals or tiers. Use only when catalog initialization is needed." disabled={busy} onConfirm={() => action(
            () => api("/admin/skill-catalog/initialize", { method: "POST", body: "{}" }),
            "Preset skills added or reused. Existing skills and assessment history were retained.",
          )}/>
          <p className="text-sm">
            Basic versions use 10 equally weighted multiple-choice questions.
            Advanced versions use 5–10 applied scenario choices with predefined
            rubrics. The default threshold is 80%. Published versions are
            immutable; import another version to revise content or thresholds.
            No arbitrary questions are generated.
          </p>
          <AssessmentSkillPicker skills={skills} selectedId={(()=>{try{return JSON.parse(json).skillId||"";}catch{return "";}})()} onSelect={id=>{try{const value=JSON.parse(json);if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Use a JSON object.");setJson(JSON.stringify({...value,skillId:id},null,2));setError("");}catch{setError("Fix the assessment question data before selecting a skill. Your entered text has been retained.");}}}/>
          <div className="space-y-2">{panelButton("guide","View Import Guide")}<div id="admin-guide-panel" role="region" aria-label="Import Guide" hidden={!panels.guide} className="space-y-3 pt-4">
            <p className="text-sm">
              Each item contains kind (MULTIPLE_CHOICE for basic, APPLIED_CHOICE
              for advanced), prompt, competency, rubric, points, and options.
              Each option contains text and isCorrect. Exactly one option is
              correct. Advanced items must evaluate applied competency; a human
              validator must verify this before publishing.
            </p>
          </div></div>
          <form onSubmit={e=>e.preventDefault()} className="space-y-3">
            <div className="space-y-2">{panelButton("advanced","Advanced Import Options")}<div id="admin-advanced-panel" role="region" aria-label="Advanced Import Options" hidden={!panels.advanced} className="space-y-3 pt-4">
            <label htmlFor="bank-json" className="block font-semibold">
              Assessment Question Data
            </label>
            <textarea
              id="bank-json"
              className={`${inputClass} min-h-72 font-mono text-sm`}
              value={json}
              onChange={(e) => setJson(e.target.value)}
              spellCheck={false}
            />
            </div></div>
            <AdminConfirm label="Import Draft" disabled={busy} beforeOpen={prepareImport} title={`Import a draft for ${skills.find(s=>s.id===importCandidate?.skillId)?.name||importCandidate?.skillId||"the selected skill"} · ${importCandidate?.level||"level not supplied"}?`} description="Creates a new DRAFT version only. It is unavailable to students until a genuine review and separate publication. No existing version or question is overwritten." onConfirm={()=>action(()=>api("/admin/assessments/versions",{method:"POST",body:JSON.stringify(importCandidate)}),"Draft imported. It remains unavailable to students until validated and published.")}/>
          </form>
        </section>
)}
      {section==="academic"&&<div className="space-y-5">        <section className="admin-panel space-y-4">
          <h2 className="text-xl font-semibold">Official academic options</h2>
          <p className="text-sm">
            Use the institution's approved department and year-level names and
            stable codes. Empty lists remain unavailable rather than receiving
            guessed values.
          </p>
          <div className="space-y-2">{panelButton("option","Add Academic Option",true)}<div id="admin-option-panel" role="region" aria-label="Academic Option" hidden={!panels.option} className="space-y-3 pt-4">
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
          {closeButton("option","Academic Option")}</div></div>
        </section>
        <section className="admin-panel space-y-4">
          <h2 className="text-xl font-semibold">
            College programs and department mapping
          </h2>
          <p className="text-sm">
            Review the stored department mapping and permitted years for each
            program. Recorded validation and provisional status are shown
            separately; the original team draft is available below.
          </p>
          {academicData.provisionalDraft && (
            <div className="space-y-2">{panelButton("mappings","Review Mappings")}<div id="admin-mappings-panel" role="region" aria-label="Proposed Mappings" hidden={!panels.mappings} className="space-y-3 pt-4">
              <p className="my-2 text-sm">
                {academicData.provisionalDraft.source}
              </p>
              <ul className="space-y-2 text-sm">
                {academicData.provisionalDraft.departments.map((d) => (
                  <li key={d.code}>
                    {d.name}:{" "}
                    {d.programCodes
                      .map(
                        (code) =>
                          academicData.programs.find((p) => p.code === code)
                            ?.label ?? code,
                      )
                      .join(", ")}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                disabled={busy}
                className="mt-3"
                onClick={() =>
                  void action(
                    () =>
                      api("/admin/academic-programs/provisional-mapping", {
                        method: "POST",
                        body: "{}",
                      }),
                    "Provisional mapping imported for unassigned programs. Existing mappings were retained; no official validation was assigned.",
                  )
                }
              >
                Import Provisional Mapping
              </Button>
            {closeButton("mappings","Proposed Mappings")}</div></div>
          )}
          <Button
            disabled={busy}
            variant="outline"
            className="h-auto min-h-11 w-fit max-w-full whitespace-normal break-words border-blue-300 bg-blue-50 px-4 py-2 text-center text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
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
          <label className="block text-sm">Search academic programs<input type="search" value={programSearch} onChange={e=>setProgramSearch(e.target.value)}/></label>
          <div className="admin-scroll" tabIndex={0} aria-label="Scrollable academic program directory">
            <table className="admin-table admin-academic-table">
              <caption className="sr-only">Academic program directory</caption>
              <thead><tr><th>Program</th><th>College / department</th><th>Allowed years</th><th>Stored mapping status</th><th>Evidence</th></tr></thead>
              <tbody>{academicData.programs.filter(p=>`${p.code} ${p.label} ${p.department?.name||""}`.toLowerCase().includes(programSearch.toLowerCase())).map(p=><tr key={p.id}>
                <td><strong>{p.label}</strong></td>
                <td>{p.department?.name||"Not assigned"}</td>
                <td>{descendingAcademicYears(p.yearLevels).map((y:any)=>y.name).join(", ")||"Not configured"}</td>
                <td><AdminStatus plain indicator={p.mappingValidatedAt?"check":"dot"} status={p.mappingValidatedAt?"Validation recorded":p.department?"Provisional":"Not recorded"}/>{!p.mappingValidatedAt&&<p className="admin-record-caption">Excluded from WRMR</p>}</td>
                <td><Button type="button" variant="outline" size="sm" aria-label={`Stored mapping evidence for ${p.label}`} aria-expanded={selectedProgramId===p.id} onClick={()=>setSelectedProgramId(selectedProgramId===p.id?null:p.id)}>View details</Button></td>
              </tr>)}</tbody>
            </table>
          </div>
          {selectedProgram&&<section aria-label="Program mapping details" className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{selectedProgram.label}</h3><Button type="button" variant="ghost" size="sm" onClick={()=>setSelectedProgramId(null)}>Close program details</Button></div><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt>College / department</dt><dd>{selectedProgram.department?.name||"Not assigned"}</dd></div><div><dt>Eligible year levels</dt><dd>{descendingAcademicYears(selectedProgram.yearLevels).map((y:any)=>y.name).join(", ")||"Not configured"}</dd></div><div><dt>Stored mapping status</dt><dd>{selectedProgram.mappingValidatedAt?"Validation recorded":selectedProgram.department?"Provisional":"Not recorded"}</dd></div><div><dt>Validation date</dt><dd>{selectedProgram.mappingValidatedAt?new Date(selectedProgram.mappingValidatedAt).toLocaleString():"Not recorded"}</dd></div></dl><p className="text-sm">Recorded evidence is shown as stored; this view does not establish university approval.</p><pre className="whitespace-pre-wrap break-words text-sm">{selectedProgram.mappingNotes||"No mapping evidence supplied."}</pre><details><summary className="cursor-pointer text-sm">Technical review details</summary><p className="mt-2 break-all text-sm">Program ID: {selectedProgram.id} · Mapping version {selectedProgram.mappingVersion} · Reviewer ID: {selectedProgram.mappingValidatedById||"not recorded"}</p></details></section>}
          <h3 className="text-lg font-semibold">Program Management</h3>
          <div className="flex flex-wrap gap-3">{panelButton("department","Change Department")}{panelButton("years","Manage Year Levels")}</div>
          <div id="admin-department-panel" role="region" aria-label="Change Department" hidden={!panels.department} className="space-y-3 pt-4"><h4 className="font-semibold">Change Department</h4>
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
                {academicData.departments.filter((d) => d.isActive !== false).map((d) => (
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
            <Button
              type="button"
              variant="outline"
              disabled={
                busy ||
                !mapping.programId ||
                !mapping.departmentId ||
                !mapping.validationNotes.trim()
              }
              onClick={() =>
                void action(
                  () =>
                    api(
                      `/admin/academic-programs/${mapping.programId}/department-draft`,
                      {
                        method: "PATCH",
                        body: JSON.stringify({
                          departmentId: mapping.departmentId,
                          proposalNotes: mapping.validationNotes,
                          mappingVersion: academicData.programs.find(
                            (p) => p.id === mapping.programId,
                          )?.mappingVersion,
                        }),
                      },
                    ),
                  "Provisional mapping saved without official validation.",
                )
              }
            >
              Save as Provisional
            </Button>
          </form>
          {closeButton("department","Change Department")}</div>
          <p className="text-sm text-slate-600 dark:text-slate-300">BSIT, BSIHM-CA and BSIHM-HACLO intentionally remain first-year-only. Viewing this workspace does not change mappings or year levels; changes require the existing approval process.</p>
          <div id="admin-years-panel" role="region" aria-label="Manage Year Levels" hidden={!panels.years} className="space-y-3 pt-4"><h4 className="font-semibold">Manage Year Levels</h4>
          <form
            className="space-y-3"
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
              {descendingAcademicYears(academicData.yearLevels).map((y) => (
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
          {closeButton("years","Manage Year Levels")}</div>
        </section>
</div>}
      {section==="reports"&&<AdminReports reports={reports} busy={busy} action={action}/>}
    </>}
  </AdminShell>;
}
