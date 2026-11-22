import notices from "@/app/content/legal-notices.json";

// Existing documents preserved separately, not a newly approved/reconciled notice.
export type LegalDocument = "summary" | "account";
export const legalTitles = {
  summary: "Terms of Service & Privacy Policy",
  account: "Privacy and account information",
};
export default function LegalNoticeContent({ document }: { document: LegalDocument }) {
  return (
    <div className="space-y-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 [overflow-wrap:anywhere]">
      {notices[document].map(section => (
        <section key={section.heading} className="space-y-2">
          <h2 className="text-sm font-bold text-blue-900 dark:text-blue-100">{section.heading}</h2>
          {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
    </div>
  );
}
