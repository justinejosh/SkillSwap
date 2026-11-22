import { useEffect, useState } from "react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/app/components/ui/utils";

type Layout = "neutral" | "dashboard" | "cards" | "profile" | "messages" | "list" | "form" | "table";
function Bar({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4 max-w-full rounded-lg bg-slate-200/80 dark:bg-slate-700/60", className)} />;
}
function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("min-w-0 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900", className)}>{children}</div>;
}
function Rows({ count = 3 }: { count?: number }) {
  return <>{Array.from({ length: count }, (_, i) => <div key={i} className="flex min-w-0 items-center gap-3 py-3"><Bar className="size-10 shrink-0 rounded-xl" /><div className="min-w-0 flex-1 space-y-2"><Bar className="w-2/3" /><Bar className="h-3 w-1/2" /></div></div>)}</>;
}

export function LoadingContent({ layout = "cards", label, className }: { layout?: Layout; label: string; className?: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Skip visible skeletons when the response commits before the next frame.
    // Never hold resolved content on screen for a minimum/artificial duration.
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const fields = <>{[0, 1, 2].map(i => <div key={i} className="space-y-2"><Bar className="h-3 w-1/3" /><Bar className="h-12 w-full rounded-xl" /></div>)}</>;
  return <section role="status" aria-label={label} aria-busy="true" className={cn("min-w-0 w-full", className)} data-loading-layout={layout}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className={cn("space-y-5", !ready && "invisible")}>
      {layout === "neutral" ? <Panel className="mx-auto max-w-md"><Bar className="h-6 w-1/2" /><Bar className="w-3/4" /><Bar className="h-24 w-full rounded-2xl" /></Panel>
      : layout === "profile" ? <Panel className="mx-auto max-w-2xl"><Bar className="mx-auto size-24 rounded-3xl" /><Bar className="mx-auto h-6 w-1/2" /><div className="grid grid-cols-2 gap-4"><Bar className="h-16" /><Bar className="h-16" /></div>{fields}<Bar className="h-12 rounded-xl" /></Panel>
      : layout === "messages" ? <div className="grid gap-4 md:grid-cols-[1fr_2fr]"><Panel><Bar className="w-1/2" /><Rows count={4} /></Panel><Panel className="hidden min-h-80 flex-col justify-between md:flex"><Bar className="w-1/3" /><div className="space-y-4"><Bar className="h-12 w-2/3" /><Bar className="ml-auto h-16 w-2/3" /></div><Bar className="h-12 rounded-xl" /></Panel></div>
      : layout === "form" ? <Panel><Bar className="h-6 w-1/2" />{fields}<Bar className="h-12 rounded-xl" /></Panel>
      : layout === "table" ? <Panel><Bar className="h-6 w-1/2" /><div className="flex gap-3"><Bar className="h-11 flex-1" /><Bar className="h-11 flex-1" /></div><Rows count={4} /></Panel>
      : layout === "list" ? <Panel><Bar className="h-6 w-1/2" /><Rows count={4} /></Panel>
      : <><Bar className="h-7 w-1/2" />{layout === "cards" && <Bar className="h-11 w-full rounded-xl" />}<div className={cn("grid gap-4 sm:grid-cols-2", layout === "cards" && "lg:grid-cols-3")}>{[0, 1, 2].slice(0, layout === "dashboard" ? 2 : 3).map(i => <Panel key={i}><div className="flex items-center gap-3"><Bar className="size-11 shrink-0 rounded-xl" /><Bar className="w-1/2" /></div><Bar className="h-20 w-full rounded-2xl" /><Bar className="h-10 w-2/3 rounded-xl" /></Panel>)}</div></>}
    </div>
  </section>;
}

export function PageSkeleton({ layout = "neutral", label }: { layout?: Layout; label: string }) {
  return <div className="min-h-dvh knoxite-surface p-4 sm:p-6"><div className="mx-auto max-w-7xl space-y-6">
    <div aria-hidden="true" className="flex h-16 items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900"><Bar className="h-8 w-28" /><Bar className="h-8 w-20" /></div>
    <LoadingContent layout={layout} label={label} />
  </div></div>;
}
