import { useId } from "react";
import { BookOpen, Presentation } from "lucide-react";

type Skill = { id: string; name: string };
export function ReciprocalExchange({ learn, teach }: { learn: Skill[]; teach: Skill[] }) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-exchange`} className="@container space-y-2">
      <h4 id={`${id}-exchange`} className="text-sm font-bold">Your Skill Exchange</h4>
      <dl className="grid grid-cols-1 gap-2 @[22rem]:grid-cols-2">
        {[{ label: "What you'll learn", skills: learn, Icon: BookOpen, color: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100", caption: "text-blue-800 dark:text-blue-200" },
          { label: "What you'll teach", skills: teach, Icon: Presentation, color: "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100", caption: "text-emerald-800 dark:text-emerald-200" }].map(({ label, skills, Icon, color, caption }) => (
          <div key={label} role="group" aria-label={label} className={`min-w-0 rounded-xl border p-3 ${color}`}>
            <dt className={`mb-1.5 flex items-center gap-2 text-xs font-semibold ${caption}`}><Icon aria-hidden="true" className="size-4 shrink-0" />{label}</dt>
            <dd className="space-y-1 text-sm font-semibold">{skills.map(skill => <p key={skill.id} className="break-words">{skill.name}</p>)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
