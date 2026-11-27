import { ReactNode, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/app/components/ui/alert-dialog";
export const countLabel=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)?value.toLocaleString():"Unavailable";
export function AdminConfirm({label,title,description,onConfirm,disabled=false,icon,beforeOpen}:{label:string;title:string;description:string;onConfirm:()=>Promise<unknown>;disabled?:boolean;icon?:ReactNode;beforeOpen?:()=>boolean}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);const lock=useRef(false);
  return <><Button type="button" variant="outline" size="sm" disabled={disabled||busy} onClick={()=>{if(!beforeOpen||beforeOpen())setOpen(true);}}>{icon}{label}</Button><AlertDialog open={open} onOpenChange={v=>{if(!lock.current)setOpen(v);}}><AlertDialogContent className="admin-dialog"><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button disabled={busy} onClick={async()=>{if(lock.current)return;lock.current=true;setBusy(true);try{await onConfirm();setOpen(false);}finally{lock.current=false;setBusy(false);}}}>{busy?"Working...":"Confirm"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
export function AdminPager({page,total,pageSize,onPage}:{page:number;total:number;pageSize:number;onPage:(page:number)=>void}) {
  const pages=Math.max(1,Math.ceil(total/pageSize));return <div className="admin-pagination flex flex-wrap items-center justify-between gap-3 text-sm"><p>{countLabel(total)} records · Page {page} of {pages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page<=1} onClick={()=>onPage(page-1)}>Previous</Button><Button variant="outline" size="sm" disabled={page>=pages} onClick={()=>onPage(page+1)}>Next</Button></div></div>;
}

export function AdminStatus({ status, plain = false, indicator = "dot" }: { status: string; plain?: boolean; indicator?: "dot" | "check" }) {
  if (plain) {
    const tones: Record<string, string> = {
      ACTIVE: "text-emerald-700 dark:text-emerald-300",
      VALIDATED: "text-emerald-700 dark:text-emerald-300",
      "VALIDATION RECORDED": "text-emerald-700 dark:text-emerald-300",
      "TEMPORARY SUSPENSION": "text-amber-800 dark:text-amber-300",
      "LEGACY SUSPENSION": "text-red-700 dark:text-red-300",
      PROVISIONAL: "text-amber-800 dark:text-amber-300",
    };
    return <span className={`admin-status-plain inline-flex items-center gap-1.5 text-xs font-semibold ${tones[status.toUpperCase()] || "text-slate-600 dark:text-slate-300"}`}>
      {indicator === "check" ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />}{status}
    </span>;
  }
  const tones: Record<string, string> = {
    BASIC: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    ADVANCED: "bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
    ACTIVE: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    PUBLISHED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    RESOLVED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    DRAFT: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    PENDING: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    SUSPENDED: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  };
  return <span className={`admin-status inline-flex rounded-md px-2 py-1 text-xs font-semibold ${tones[status.toUpperCase()] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{status}</span>;
}
