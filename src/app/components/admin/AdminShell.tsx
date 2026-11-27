import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, Moon, Sun, LogOut, LayoutDashboard, ChartNoAxesCombined, Star, Users, BookOpenCheck, MessagesSquare, Flag, Trophy, ShieldCheck, GraduationCap, ChevronRight } from "lucide-react";
import { useAccountTheme } from "@/app/lib/theme";
import { logoutSession } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { AdminConfirm } from "./AdminUI";

export const adminNavigation = [
  ["Overview", "/admin-dashboard"], ["Analytics & Trends", "/admin-dashboard?section=analytics"],
  ["Peer Evaluations", "/admin-dashboard?section=evaluations"],
  ["Student Management", "/admin-dashboard?section=students"], ["Assessment Management", "/admin/assessments"],
  ["Forum Moderation", "/admin-dashboard?section=forum"], ["Reports", "/admin/assessments?section=reports"],
  ["Leaderboard Audit", "/admin-dashboard?section=leaderboard"], ["Integrity Review", "/admin/integrity"],
  ["Academic Configuration", "/admin/assessments?section=academic"],
] as const;
const navigationIcons = [LayoutDashboard, ChartNoAxesCombined, Star, Users, BookOpenCheck, MessagesSquare, Flag, Trophy, ShieldCheck, GraduationCap];
export function AdminShell({title,children}:{title:string;children:ReactNode}) {
  const [open,setOpen]=useState(false),[error,setError]=useState("");
  const [dark,toggle]=useAccountTheme();const location=useLocation(),navigate=useNavigate();
  const section=new URLSearchParams(location.search).get("section");
  return <div className="admin-console knoxite-surface min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div className="mx-auto grid max-w-[1600px] md:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="admin-sidebar border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3"><Link to="/admin-dashboard" className="admin-brand flex items-center gap-3 text-lg font-bold"><span className="admin-brand-mark rounded-xl bg-blue-600 px-3 py-2 text-white">K</span>Knoxite<span className="sr-only"> administration</span></Link><Button variant="outline" size="icon" className="size-11 md:hidden" aria-label="Administrator navigation" aria-expanded={open} aria-controls="admin-navigation" onClick={()=>setOpen(!open)}><Menu className="size-4"/></Button></div>
        <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">ADMINISTRATION</p>
        <nav id="admin-navigation" aria-label="Admin navigation" className={`${open?"block":"hidden"} mt-4 space-y-1 md:block`}>
          {adminNavigation.map(([label,href],index)=>{const Icon=navigationIcons[index];const target=new URL(href,"http://admin.local"),active=location.pathname===target.pathname&&((section||"")===(target.searchParams.get("section")||"")||(href==="/admin/assessments"&&section==="import"));return <Link key={href} to={href} onClick={()=>setOpen(false)} aria-current={active?"page":undefined} className="admin-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-blue-600"><Icon className="size-[18px] shrink-0" aria-hidden="true"/><span>{label}</span></Link>;})}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="admin-header flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="min-w-0"><nav aria-label="Breadcrumb" className="admin-breadcrumb text-xs text-slate-600 dark:text-slate-300"><Link to="/admin-dashboard">Administration</Link><ChevronRight className="size-3" aria-hidden="true"/><span>{title}</span></nav><h1 className="mt-2 break-words text-2xl font-bold">{title}</h1></div>
          <div className="admin-header-actions flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" aria-pressed={dark} onClick={toggle}>{dark?<Sun className="mr-1 size-4"/>:<Moon className="mr-1 size-4"/>}Dark Mode</Button><AdminConfirm label="Sign Out" title="Sign out of Knoxite?" description="Your current session will be revoked by the server." onConfirm={async()=>{setError("");try{await logoutSession();navigate("/login");}catch(e){setError(e instanceof Error?e.message:"Sign out was not confirmed. Please retry.");}}} icon={<LogOut className="mr-1 size-4"/>}/></div>
        </header>
        <main id="admin-content" className="admin-content min-w-0 space-y-5 p-4 sm:p-6">{error&&<p role="alert" className="admin-error">{error}</p>}{children}</main>
      </div>
    </div>
  </div>;
}
