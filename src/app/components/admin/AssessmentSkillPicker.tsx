import { useState } from "react";
import { Button } from "../ui/button";

export function AssessmentSkillPicker({ skills, selectedId, onSelect }: { skills: { id: string; name: string; category: string }[]; selectedId: string; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState(""), [copyNotice, setCopyNotice] = useState("");
  const selected = skills.find(s => s.id === selectedId);
  const filtered = skills.filter(s => `${s.name} ${s.category}`.toLowerCase().includes(search.toLowerCase()));
  return <section aria-label="Assessment skill selection" className="space-y-3">
    <div className="admin-filters"><label>Search skills<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Assessment skill<select value={selectedId} onChange={e => { onSelect(e.target.value); setCopyNotice(""); }}><option value="">Choose a skill</option>{selected && !filtered.includes(selected) && <option value={selected.id}>{selected.name}</option>}{filtered.map(s => <option key={s.id} value={s.id}>{s.name} · {s.category}</option>)}</select></label></div>
    {!filtered.length && <p className="text-sm">No skills match your search.</p>}
    {selected && <div className="text-sm"><p className="font-semibold">{selected.name}</p><p className="capitalize text-slate-600 dark:text-slate-300">{selected.category}</p><details className="mt-2"><summary className="w-fit cursor-pointer text-blue-700 dark:text-blue-300">Technical identifier</summary><code className="my-2 block break-all">{selected.id}</code><Button type="button" variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(selected.id); setCopyNotice("Skill ID copied."); } catch { setCopyNotice("Copy unavailable. Select the identifier above to copy it manually."); } }}>Copy Skill ID</Button><p role="status" className="mt-2">{copyNotice}</p></details></div>}
  </section>;
}
