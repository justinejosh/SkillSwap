import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "@/app/lib/api";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "./ui/alert-dialog";

export function DeleteReplyButton({ postId, reply, onDeleted, moderator = false }: { postId: string; reply: { id: string; content: string; author?: { name: string } }; moderator?: boolean; onDeleted: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [reason, setReason] = useState(""), [explanation, setExplanation] = useState("");
  const lock = useRef(false);
  return <>
    <Button type="button" variant="ghost" size="sm" className="rounded-lg text-red-700 dark:text-red-300" aria-label={`Delete reply by ${reply.author?.name || "this student"}`} onClick={() => { setError(""); setReason(""); setExplanation(""); setOpen(true); }}><Trash2 className="size-4" aria-hidden="true" />Delete Reply</Button>
    <AlertDialog open={open} onOpenChange={value => { if (!lock.current) setOpen(value); }}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 transition-none"><AlertDialogHeader><AlertDialogTitle>Delete this reply?</AlertDialogTitle><AlertDialogDescription>This permanently removes only the reply by {reply.author?.name || "this student"}. The thread and other replies remain.</AlertDialogDescription></AlertDialogHeader>
        <p className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">{reply.content}</p>
        {moderator && <div className="space-y-3"><label htmlFor={`moderation-reason-${reply.id}`} className="block text-sm font-semibold">Moderation reason</label><select id={`moderation-reason-${reply.id}`} disabled={busy} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" value={reason} onChange={e=>setReason(e.target.value)}><option value="">Choose a reason</option><option value="HARASSMENT">Harassment or bullying</option><option value="INAPPROPRIATE">Inappropriate content</option><option value="SPAM">Spam</option><option value="PRIVACY">Privacy violation</option><option value="OTHER">Other</option></select>{reason==="OTHER"&&<label className="block text-sm">Short explanation<textarea required maxLength={250} disabled={busy} value={explanation} onChange={e=>setExplanation(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"/></label>}<p className="text-xs text-slate-600 dark:text-slate-300">The administrator, reason and affected record IDs are audited. Deleted reply text is not retained in the audit.</p></div>}
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep Reply</AlertDialogCancel><Button disabled={busy || (moderator && (!reason || (reason === "OTHER" && !explanation.trim())))} className="bg-red-600 text-white hover:bg-red-700" onClick={async () => {
          if (lock.current) return; lock.current = true; setBusy(true); setError("");
          try { await api(`/forum/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(reply.id)}`, { method: "DELETE", ...(moderator ? { body: JSON.stringify({ reason, ...(reason === "OTHER" ? { explanation } : {}) }) } : {}) }); setOpen(false); await onDeleted(); }
          catch (e) { setError(e instanceof Error ? e.message : "Unable to delete this reply."); }
          finally { lock.current = false; setBusy(false); }
        }}>{busy ? "Deleting..." : "Delete Reply"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
