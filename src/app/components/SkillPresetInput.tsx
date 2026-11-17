import { useEffect, useState } from "react";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { api } from "@/app/lib/api";

export interface SkillPreset { key: string; name: string; category: string; skillId: string | null; conflict?: boolean }
export function SkillPresetInput({ value, category, onChange }: {
  value: string; category: string;
  onChange: (name: string, category: string, presetKey?: string) => void;
}) {
  const [presets, setPresets] = useState<SkillPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const controller = new AbortController();
    api<{ presets: SkillPreset[] }>("/profile/skill-catalog", { signal: controller.signal })
      .then((data) => { if (!Array.isArray(data.presets)) throw new Error("Catalog unavailable"); setPresets(data.presets); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => { setActive(-1); }, [category, value]);
  useEffect(() => {
    if (active >= 0) document.getElementById(`skill-preset-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);
  const matches = presets.filter((p) => p.category === category && p.name.toLowerCase().includes(value.trim().toLowerCase()));
  const choose = (p: SkillPreset) => { onChange(p.name, p.category, p.key); setOpen(false); setActive(-1); };
  return (
    <div className="space-y-1.5">
      <Label htmlFor="new-skill-name" className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Choose a Skill</Label>
      <Input
        id="new-skill-name" placeholder="Search predefined skills..."
        role="combobox" aria-autocomplete="list" aria-expanded={open && !loading && !error}
        aria-controls="skill-preset-options" aria-activedescendant={open && active >= 0 ? `skill-preset-${active}` : undefined}
        aria-describedby="skill-preset-help" autoComplete="off" maxLength={100}
        value={value} required
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // Keep the form stable when focus moves to Save/category. Removing
          // suggestions during pointer-down can move Save before pointer-up on
          // a narrow screen, swallowing the student's first click.
          if (!e.relatedTarget || !e.currentTarget.form?.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        onChange={(e) => {
          const name = e.target.value;
          onChange(name, category, undefined); setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); return; }
          if ((e.key === "ArrowDown" || e.key === "ArrowUp") && matches.length) {
            e.preventDefault(); setOpen(true);
            setActive((old) => e.key === "ArrowDown" ? (old + 1) % matches.length : (old <= 0 ? matches.length - 1 : old - 1));
          } else if (e.key === "Enter" && open && active >= 0) {
            e.preventDefault(); if (!matches[active]?.conflict) choose(matches[active]);
          }
        }}
        className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 h-11 rounded-xl text-sm focus-visible:ring-blue-600"
      />
      <p id="skill-preset-help" className="text-xs text-slate-500 dark:text-slate-400">Select a predefined skill in this category. Use arrow keys and Enter to choose.</p>
      {loading && <p className="text-xs">Loading skill suggestions…</p>}
      {error && <p role="alert" className="text-xs">The preset catalog is unavailable. Close and reopen this dialog to retry.</p>}
      {open && !loading && !error && (
        <div>
          <div id="skill-preset-options" role="listbox" aria-label="Skill presets" className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
            {matches.map((p, i) => (
              <button key={p.key} id={`skill-preset-${i}`} type="button" role="option" aria-selected={active === i} disabled={p.conflict} tabIndex={-1}
                onPointerDown={(e) => e.preventDefault()} onClick={() => choose(p)}
                className={`block w-full px-3 py-2 text-left text-sm disabled:opacity-50 ${active === i ? "bg-blue-100 dark:bg-blue-950" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                {p.name}{p.conflict ? " — needs administrator review" : ""}
              </button>
            ))}
          </div>
          {!matches.length && <p role="status" className="mt-2 text-xs">No matching preset skills</p>}
        </div>
      )}
    </div>
  );
}
