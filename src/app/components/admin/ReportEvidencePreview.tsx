import { useEffect, useState } from "react";
import { Image } from "lucide-react";
import { authenticatedFetch } from "@/app/lib/api";
import { API_BASE_URL } from "@/config";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

export function ReportEvidencePreview({ report }: { report: any }) {
  const [open, setOpen] = useState(false), [url, setUrl] = useState(""), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return; const controller = new AbortController(); let objectUrl = "";
    const token = localStorage.getItem("knoxite_token"); setUrl(""); setError(""); setLoading(true);
    void (async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/admin/reports/${encodeURIComponent(report.id)}/evidence`, { signal: controller.signal });
        if (!response.ok) throw new Error((await response.json()).error || "Unable to open private evidence.");
        const blob = await response.blob();
        if (blob.type !== "image/webp" || blob.size > 5 * 1024 * 1024) throw new Error("Unexpected evidence response.");
        if (controller.signal.aborted || token !== localStorage.getItem("knoxite_token")) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to open evidence."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [open, report.id]);
  return <><Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><Image className="size-4" aria-hidden="true" />View Evidence</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 transition-none"><DialogHeader><DialogTitle>Supporting evidence</DialogTitle><DialogDescription>{report.reason.replaceAll("_", " ")} · Report about {report.target.name}. Viewing is audited; an attachment is not a finding of misconduct.</DialogDescription></DialogHeader><p className="whitespace-pre-wrap break-words text-sm">{report.description}</p>{loading && <p role="status">Loading private image...</p>}{error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}{url && <img src={url} alt="Supporting image attached to this report" className="max-h-[60dvh] w-full rounded-lg object-contain" />}</DialogContent></Dialog></>;
}
