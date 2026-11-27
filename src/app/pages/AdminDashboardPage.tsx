import { PeerEvaluations } from "@/app/components/admin/PeerEvaluations";
import { LoadingContent } from "@/app/components/PageSkeleton";
import { Users, ArrowLeftRight, CircleCheck, MessageSquareText, RefreshCw, Info, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { AdminAnalytics } from "@/app/components/admin/AdminAnalytics";
import { StudentManagement, ForumModeration, LeaderboardAudit } from "@/app/components/admin/AdminWorkspaces";
import { countLabel } from "@/app/components/admin/AdminUI";

export default function AdminDashboardPage() {
  const [params]=useSearchParams();const requested=params.get("section")||"overview";
  const section=["overview","analytics","students","forum","leaderboard","evaluations"].includes(requested)?requested:"overview";
  const titles:Record<string,string>={overview:"Overview",evaluations:"Peer Evaluations",analytics:"Analytics & Trends",students:"Student Management",forum:"Forum Moderation",leaderboard:"Leaderboard Audit"};
  const [data,setData]=useState<any>(null),[dashboard,setDashboard]=useState<any>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[refresh,setRefresh]=useState(0);
  useEffect(()=>{let live=true;setError("");if(!["overview","analytics"].includes(section)){setLoading(false);return;}
    setLoading(true);Promise.all([api("/analytics"),section==="overview"?api("/admin/dashboard-data"):Promise.resolve(null)]).then(([a,d])=>{if(live){setData(a);setDashboard(d);}}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};
  },[section,refresh]);
  const cards=[{title:"Registered Students",icon:Users,value:data?.systemHealth?.totalUsers,description:"Registered STUDENT accounts, including suspended accounts; administrators excluded."},{title:"Active Ongoing Swaps",icon:ArrowLeftRight,value:data?.swapMetrics?.activeSwaps,description:"CONFIRMED exchanges only. Pending agreements are shown separately."},{title:"Completed Swaps",icon:CircleCheck,value:data?.swapMetrics?.completedSwaps,description:"Validated completed outcomes using the existing exchange-integrity gate."},{title:"Peer Evaluations",icon:MessageSquareText,value:data?.systemHealth?.totalReviews,description:"Validated review submissions on completed, integrity-marked exchanges; not unique reviewers."}];
  return <AdminShell title={titles[section]}><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600 dark:text-slate-300">Live administrative records. Refresh reloads data only.</p><Button variant="outline" disabled={loading} onClick={()=>setRefresh(n=>n+1)}><RefreshCw className="size-4" aria-hidden="true"/>Refresh data</Button></div>
    {error&&<p role="alert" className="admin-error">{error}</p>}{loading&&!data?<LoadingContent layout="dashboard" label="Loading administrator data..." />:<>
      {section==="overview"&&<>
        <div className="admin-metrics grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(c=><section key={c.title} className="admin-panel admin-metric">
            <div className="admin-metric-icon"><c.icon size={21} strokeWidth={1.8} aria-hidden="true"/></div>
            <h2>{c.title==="Peer Evaluations"?<Link to="/admin-dashboard?section=evaluations" className="rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-300 after:absolute after:inset-0 after:rounded-2xl">{c.title}</Link>:c.title}</h2>
            <p className="admin-metric-value">{countLabel(c.value)}</p>
            <p className="admin-metric-description">{c.description}</p>
          </section>)}
        </div>
        <section className="admin-panel admin-scope">
          <div className="admin-section-heading"><h2><Info size={19} aria-hidden="true"/>Reporting scope</h2>
            <div className="admin-scope-links"><Link to="/admin-dashboard?section=analytics">View analytics<ArrowUpRight size={14} aria-hidden="true"/></Link><Link to="/admin-dashboard?section=students">Manage accounts<ArrowUpRight size={14} aria-hidden="true"/></Link><Link to="/admin/assessments?section=reports">Review reports<ArrowUpRight size={14} aria-hidden="true"/></Link></div>
          </div>
          <dl className="admin-scope-grid">
            <div><dt>Pending agreements</dt><dd>{countLabel(data?.swapMetrics?.pendingSwaps)}</dd></div>
            <div><dt>All registered accounts (includes ADMIN)</dt><dd>{countLabel(dashboard?.stats?.totalUsers)}</dd></div>
            <div><dt>Open report and integrity records</dt><dd>{countLabel(dashboard?.stats?.reportedIssues)}</dd></div>
          </dl>
          <p className="admin-scope-note">Overview counts are all-time. Monthly charts cover the latest six UTC calendar months. Legacy/incomplete outcomes may be excluded from validated totals.</p>
        </section>
      </>}
      {section==="analytics"&&data&&<AdminAnalytics data={data}/>}
      {section==="evaluations"&&<PeerEvaluations refreshKey={refresh}/>}
      {section==="students"&&<StudentManagement refreshKey={refresh}/>}{section==="forum"&&<ForumModeration refreshKey={refresh}/>}{section==="leaderboard"&&<LeaderboardAudit refreshKey={refresh}/>}
    </>}
  </AdminShell>;
}
