import { useRef } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import LegalNoticeContent, { legalTitles, type LegalDocument } from "./LegalNoticeContent";

export type { LegalDocument } from "./LegalNoticeContent";
export default function LegalNoticeDialog({ document, onClose }: {
  document: LegalDocument | null;
  onClose: () => void;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog open={document !== null} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        onOpenAutoFocus={() => { opener.current = globalThis.document.activeElement as HTMLElement | null; }}
        onCloseAutoFocus={event => { event.preventDefault(); if (opener.current?.isConnected) opener.current.focus(); }}
        className="flex min-h-0 max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col gap-0 overflow-hidden rounded-3xl border-blue-100 bg-white p-0 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <header className="shrink-0 border-b border-blue-100 px-5 py-4 pr-12 dark:border-slate-800">
          <DialogTitle className="text-base font-bold leading-snug text-blue-900 dark:text-blue-100">{legalTitles[document || "summary"]}</DialogTitle>
          <DialogDescription className="sr-only">Read the information below. Close to return to your form. Acceptance is recorded only through the registration checkbox and submission.</DialogDescription>
        </header>
        <div tabIndex={0} aria-label="Policy content" className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 focus-visible:outline-2 focus-visible:outline-blue-600">
          {document && <LegalNoticeContent document={document} />}
        </div>
        <footer className="shrink-0 border-t border-blue-100 px-5 py-4 dark:border-slate-800">
          <DialogClose asChild>
            <Button type="button" className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700">Back to form</Button>
          </DialogClose>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
