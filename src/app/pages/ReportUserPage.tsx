import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { API_BASE_URL } from "@/config";
import { api, authenticatedFetch } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { currentAccountId } from "@/app/lib/theme";
export default function ReportUserPage() {
  const [params] = useSearchParams();
  const [targetId, setTargetId] = useState(params.get("userId") || "");
  const [reason, setReason] = useState("NO_SHOW");
  const [description, setDescription] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [evidenceEnabled, setEvidenceEnabled] = useState(false), [image, setImage] = useState<File|null>(null), [preview, setPreview] = useState(""), [imageError, setImageError] = useState(""), [checkingImage, setCheckingImage] = useState(false);
  const imageSequence = useRef(0), fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { let live = true; void api("/reports/capabilities").then(value => { if (live) setEvidenceEnabled(value.imageEvidenceEnabled === true); }).catch(() => { if (live) setEvidenceEnabled(false); }); return () => { live = false; imageSequence.current++; }; }, []);
  useEffect(() => { if (!image) { setPreview(""); return; } const url = URL.createObjectURL(image); setPreview(url); return () => URL.revokeObjectURL(url); }, [image]);
  async function selectImage(file?: File) {
    const sequence = ++imageSequence.current; setImageError(""); setCheckingImage(false);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) { setImage(null); setImageError("Choose one JPG, PNG or WebP image no larger than 5 MB, or remove the selection."); return; }
    setCheckingImage(true);
    try { const bitmap = await createImageBitmap(file); const valid = bitmap.width <= 8000 && bitmap.height <= 8000 && bitmap.width * bitmap.height <= 16000000; bitmap.close(); if (!valid) throw new Error(); if (sequence === imageSequence.current) setImage(file); }
    catch { if (sequence === imageSequence.current) { setImage(null); setImageError("Choose a valid image up to 8,000 pixels per side and 16 megapixels, or remove the selection."); } }
    finally { if (sequence === imageSequence.current) setCheckingImage(false); }
  }
  function removeImage() { imageSequence.current++; setImage(null); setImageError(""); setCheckingImage(false); if (fileInput.current) fileInput.current.value = ""; }
  const isSelf = targetId.trim().toLowerCase() === currentAccountId()?.toLowerCase();
  const load = () => api<any[]>("/reports").then(setReports);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || checkingImage || imageError) return;
    if (isSelf) { setError("You cannot report yourself. Choose another student's profile."); return; }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (image) {
        const form = new FormData(); form.set("targetId", targetId); form.set("reason", reason); form.set("description", description); form.set("evidence", image);
        const response = await authenticatedFetch(`${API_BASE_URL}/reports`, { method: "POST", body: form });
        if (!response.ok) throw new Error((await response.json()).error || "Report upload failed. Your selected image has been retained.");
      } else await api("/reports", { method: "POST", body: JSON.stringify({ targetId, reason, description }) });
      setNotice("Report saved for administrator review.");
      setDescription("");
      removeImage();
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-slate-50 p-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          to="/dashboard"
          className="text-blue-700 underline dark:text-blue-300"
        >
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Report a concern</h1>
        {error && (
          <p role="alert" className="text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {isSelf && <p role="status">You cannot report your own account. Your earlier reports remain available below.</p>}
        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <label className="block">
            Student ID
            <input
              required
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="mt-1 w-full rounded border p-2 dark:bg-slate-800"
            />
          </label>
          <p className="text-xs">
            Open a student's public profile and select Report a concern to fill
            this automatically.
          </p>
          <label className="block">
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border p-2 dark:bg-slate-800"
            >
              <option value="NO_SHOW">No-show</option>
              <option value="HARASSMENT">Harassment</option>
              <option value="MISREPRESENTATION">Misrepresentation</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <div className="block">
            <label htmlFor="report-description">Description</label>
            <textarea id="report-description"
              required
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-32 w-full rounded border p-2 dark:bg-slate-800"
            />
          </div>
          {evidenceEnabled ? <div className="space-y-3">
            <label htmlFor="report-evidence" className="block text-sm font-semibold">Supporting Evidence (Optional)</label>
            <input ref={fileInput} id="report-evidence" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} aria-describedby="report-evidence-help" className="block w-full min-w-0 text-sm" onChange={e=>void selectImage(e.target.files?.[0])}/>
            <p id="report-evidence-help" className="text-xs text-slate-600 dark:text-slate-300">One JPG, PNG or WebP image, up to 5 MB. Images are private and available only to authorized administrators reviewing your report.</p>
            {checkingImage&&<p role="status" className="text-sm">Checking image...</p>}
            {imageError&&<p role="alert" className="text-sm text-red-700 dark:text-red-300">{imageError}</p>}
            {preview&&<img src={preview} alt="Selected supporting evidence preview" className="max-h-48 max-w-full rounded-lg object-contain"/>}
            {(image||imageError)&&<Button type="button" size="sm" variant="outline" disabled={busy} onClick={removeImage}>Remove Image</Button>}
          </div> : <p className="text-sm text-slate-600 dark:text-slate-300">Image attachments are not available yet. You can still submit a text-only report.</p>}
          <Button disabled={busy || isSelf || checkingImage || !!imageError}>
            {busy ? "Saving..." : "Submit Report"}
          </Button>
        </form>
        <section className="space-y-3">
          <h2 className="text-lg font-bold">Your reports</h2>
          {!reports.length && <p>No reports filed.</p>}
          {reports.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border p-4 dark:border-slate-700"
            >
              <p>
                {r.target.name} · {r.reason.replaceAll("_", " ")} · {r.status}
              </p>
              <p className="whitespace-pre-wrap text-sm">{r.description}</p>
              {r.resolution && (
                <p className="mt-2 text-sm">Resolution: {r.resolution}</p>
              )}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
