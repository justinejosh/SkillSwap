import { LoadingContent } from "@/app/components/PageSkeleton";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "@/app/lib/api";
import { Button } from "@/app/components/ui/button";
import { ExchangeSummary } from "@/app/components/ExchangeSummary";
import { DateTimeText } from "@/app/components/DateTimeText";

function localMinute(time: number) {
  const d = new Date(time), pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function approvalTime(swap: any) {
  if (!swap?.requesterApprovedAt || !swap?.receiverApprovedAt) return NaN;
  const times = [Date.parse(swap.requesterApprovedAt), Date.parse(swap.receiverApprovedAt)];
  return times.every(Number.isFinite) ? Math.max(...times) : NaN;
}
function validateStart(value: string, swap: any) {
  const date = new Date(value), now = Date.now(), approved = approvalTime(swap);
  if (!value || !Number.isFinite(date.getTime())) throw new Error("Choose a valid session date and time.");
  if (localMinute(date.getTime()) !== value.slice(0,16)) throw new Error("Choose a valid local date and time.");
  if (date.getTime() <= now) throw new Error("Choose a session start strictly in the future.");
  if (date.getTime() > now + 366 * 86400_000) throw new Error("Choose a session date within one year.");
  if (!Number.isFinite(approved)) throw new Error("This agreement's approval history needs administrator review before scheduling.");
  if (date.getTime() <= approved) throw new Error("Choose a session start after both students approved the agreement.");
  return date;
}
function validateEnd(value: string, start: Date) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime()) || localMinute(date.getTime()) !== value.slice(0,16) || date.getTime() <= start.getTime())
    throw new Error("Choose a valid session end after its start.");
  return date;
}
export default function CalendarPage() {
  const [params] = useSearchParams();
  const requested = params.get("swapId") || "";
  const [sessions, setSessions] = useState<any[]>([]), [swaps, setSwaps] = useState<any[]>([]);
  const [form, setForm] = useState({swapId:requested,sessionNumber:1,scheduledAt:"",endsAt:"",meetingLink:""});
  const [error,setError] = useState(""), [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false), [loading,setLoading] = useState(true), [clock,setClock] = useState(Date.now);
  const sequence = useRef(0);
  const load = useCallback(async (initial = false) => {
    const id = ++sequence.current;
    if (initial) setLoading(true);
    try {
      const [rows,exchanges] = await Promise.all([api<any[]>("/sessions"),api<any[]>("/swaps")]);
      if (id !== sequence.current) return;
      setSessions(rows);setSwaps(exchanges);setError("");
    } catch(e) {if(id===sequence.current)setError(e instanceof Error?e.message:"Unable to load the session calendar.");}
    finally {if(id===sequence.current)setLoading(false);}
  },[]);
  useEffect(()=>{setForm(f=>({...f,swapId:requested,sessionNumber:1,scheduledAt:"",endsAt:"",meetingLink:""}));},[requested]);
  useEffect(()=>{
    void load(true);
    const sync=()=>{setClock(Date.now());if(document.visibilityState!=="hidden")void load();};
    window.addEventListener("focus",sync);window.addEventListener("pageshow",sync);
    document.addEventListener("visibilitychange",sync);
    // Read-only refresh keeps server timing/partner changes current; never renews idle sessions.
    const timer=window.setInterval(sync,15000);
    return()=>{sequence.current++;window.clearInterval(timer);window.removeEventListener("focus",sync);window.removeEventListener("pageshow",sync);document.removeEventListener("visibilitychange",sync);};
  },[load]);
  const eligible=swaps.filter(s=>s.status==="CONFIRMED"&&s.integrityVerified);
  const selected=swaps.find(s=>s.id===form.swapId), approved=approvalTime(selected);
  const unscheduled=selected?Array.from({length:selected.sessions},(_,i)=>i+1).filter(number=>!sessions.some(s=>s.swapId===selected.id&&s.sessionNumber===number&&Number.isFinite(Date.parse(s.scheduledAt)))):[];
  const canSchedule=selected?.status==="CONFIRMED"&&selected.integrityVerified&&Number.isFinite(approved);
  const locked=sessions.some(s=>s.swapId===form.swapId&&s.sessionNumber===form.sessionNumber&&(s.confirmedByMe||s.confirmedByPartner));
  const minimum=localMinute(Math.ceil((Math.max(clock,Number.isFinite(approved)?approved:clock)+1)/60000)*60000);
  const past=!!form.scheduledAt&&new Date(form.scheduledAt).getTime()<=clock;
  async function submit(e:FormEvent) {
    e.preventDefault();if(busy)return;setError("");setNotice("");setClock(Date.now());
    try {
      if(!canSchedule)throw new Error("Select a confirmed, ongoing exchange with recorded approvals.");
      if(locked)throw new Error("An acknowledged session cannot be rescheduled.");
      if(!Number.isInteger(form.sessionNumber)||form.sessionNumber<1||form.sessionNumber>selected.sessions)throw new Error("Choose a session number within your agreement.");
      const start = validateStart(form.scheduledAt,selected);
      const end = validateEnd(form.endsAt,start);
      if(selected.duration != null && end.getTime() !== start.getTime()+selected.duration*3600000)
        throw new Error("This historical agreement retains its fixed session duration.");
      if(form.meetingLink){const url=new URL(form.meetingLink);if(url.protocol!=="https:"||url.username||url.password)throw new Error("Meeting links must use HTTPS without embedded credentials.");}
      setBusy(true);
      const latest=await api(`/swaps/${encodeURIComponent(form.swapId)}`);
      if(latest.status!=="CONFIRMED"||!latest.integrityVerified)throw new Error("This exchange is no longer available for scheduling. Refresh its status.");
      const date=validateStart(form.scheduledAt,latest);
      const latestEnd=validateEnd(form.endsAt,date);
      if(latest.duration != null && latestEnd.getTime() !== date.getTime()+latest.duration*3600000)
        throw new Error("This historical agreement retains its fixed session duration.");
      await api("/sessions",{method:"POST",body:JSON.stringify({...form,scheduledAt:date.toISOString(),endsAt:latestEnd.toISOString()})});
      setNotice("Session schedule saved. Coordinate changes with your partner.");await load();
    } catch(e) {setError(e instanceof Error?e.message:"Unable to save the session schedule.");}
    finally {setBusy(false);}
  }
  const input="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus-visible:outline-blue-300";
  return <main className="knoxite-surface min-h-screen p-4 text-slate-900 dark:text-slate-100 sm:p-6">
    <div className="mx-auto max-w-[800px] space-y-5 py-3">
      <Link className="text-sm font-semibold text-blue-700 underline dark:text-blue-300" to={requested?`/swap-details/${requested}`:"/dashboard"}>{requested?"Back to Swap Tracking":"Back to Dashboard"}</Link>
      <header><p className="text-xs font-bold text-blue-700 dark:text-blue-300">KNOXITE</p><h1 className="mt-1 text-2xl font-bold">Session Calendar</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Plan sessions with your swap partner. Dates and times are shown in your local time zone.</p></header>
      {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
      {notice&&<p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">{notice}</p>}
      {loading?<LoadingContent layout="form" label="Loading your calendar..." />:<>
        {selected&&<div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6"><ExchangeSummary swap={selected}/>{!canSchedule&&<p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{selected.status!=="CONFIRMED"?"This exchange is read-only. Its existing schedules remain available below.":"Recorded bilateral approvals are required before scheduling. Contact an administrator for help."}</p>}</div>}
        <form noValidate onSubmit={submit} aria-label="Schedule a session" className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2 sm:p-6">
          <h2 className="text-lg font-bold sm:col-span-2">Schedule a session</h2>
          <label className="min-w-0 text-sm font-semibold">Confirmed exchange<select required className={input} value={form.swapId} onChange={e=>{setForm({swapId:e.target.value,sessionNumber:1,scheduledAt:"",endsAt:"",meetingLink:""});setNotice("");setError("");}}><option value="">Choose exchange</option>{eligible.map(s=><option key={s.id} value={s.id}>{s.offeredSkill.name} / {s.wantedSkill.name}</option>)}</select></label>
          <label className="min-w-0 text-sm font-semibold">Session number<select required disabled={!canSchedule} className={input} value={form.sessionNumber} onChange={e=>setForm(f=>({...f,sessionNumber:Number(e.target.value)}))}>{Array.from({length:selected?.sessions||0},(_,i)=>i+1).map(n=><option key={n} value={n} disabled={sessions.some(s=>s.swapId===form.swapId&&s.sessionNumber===n&&(s.confirmedByMe||s.confirmedByPartner))}>Session {n}{sessions.some(s=>s.swapId===form.swapId&&s.sessionNumber===n&&(s.confirmedByMe||s.confirmedByPartner))?" — acknowledged, locked":""}</option>)}</select></label>
          <label className="min-w-0 text-sm font-semibold">Date and time (your local time)<input required disabled={!canSchedule||locked} type="datetime-local" step="60" min={minimum} aria-invalid={past} aria-describedby="session-time-help" className={input} value={form.scheduledAt} onFocus={()=>setClock(Date.now())} onChange={e=>setForm(f=>({...f,scheduledAt:e.target.value}))}/></label>
          <label className="min-w-0 text-sm font-semibold">End date and time (your local time)<input required disabled={!canSchedule||locked} type="datetime-local" step="60" min={form.scheduledAt||minimum} className={input} value={form.endsAt} onChange={e=>setForm(f=>({...f,endsAt:e.target.value}))}/></label>
          <label className="min-w-0 text-sm font-semibold">HTTPS meeting link (optional)<input disabled={!canSchedule||locked} type="url" placeholder="https://" className={input} value={form.meetingLink} onChange={e=>setForm(f=>({...f,meetingLink:e.target.value}))}/></label>
          <p id="session-time-help" className="text-xs text-slate-600 dark:text-slate-300 sm:col-span-2">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Choose a future start after both agreement approvals and an end after the start. Record your actual participation in Swap Tracking; scheduling alone does not confirm attendance. Already acknowledged sessions cannot be rescheduled.{selected?.duration != null && ` This historical agreement retains its ${selected.duration}-hour session duration.`}</p>
          {past&&<p role="alert" className="text-sm text-red-800 dark:text-red-200 sm:col-span-2">The selected time has passed. Choose a future session start.</p>}
          {!eligible.length&&!error&&<p className="text-sm text-slate-600 dark:text-slate-300 sm:col-span-2">No confirmed ongoing exchanges are available for scheduling.</p>}
          <div className="flex flex-wrap gap-3 sm:col-span-2"><Button disabled={busy||!canSchedule||locked} className="bg-blue-600 text-white hover:bg-blue-700">{busy?"Saving...":"Save Session Schedule"}</Button><Button variant="outline" type="button" disabled={busy} onClick={()=>void load()}>Refresh calendar</Button></div>
        </form>
        <section aria-label="Scheduled sessions" className="space-y-3"><h2 className="text-lg font-bold">Scheduled sessions</h2>
          {!sessions.length&&!error&&<p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm dark:border-slate-700 dark:bg-slate-900">No sessions scheduled yet.</p>}
          {!!unscheduled.length&&<p className="break-words rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">Not scheduled yet: {unscheduled.map(number=>`Session ${number}`).join(", ")}. You can arrange these later.</p>}
          {sessions.map(s=><article key={s.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"><h3 className="break-words font-semibold">Session {s.sessionNumber} with {s.partner?.name || "Swap partner"}</h3><p className="text-sm"><DateTimeText value={s.scheduledAt}/></p>{s.endsAt&&<p className="text-sm">Ends: <DateTimeText value={s.endsAt} fallback="End time unavailable"/></p>}<p className="text-sm text-slate-600 dark:text-slate-300">Exchange: {(s.exchangeStatus||"Unavailable").replaceAll("_"," ")} · You: {s.confirmedByMe?"acknowledged":"not acknowledged"} · Partner: {s.confirmedByPartner?"acknowledged":"not acknowledged"}</p>{s.meetingLink&&<a className="block break-all text-sm text-blue-700 underline dark:text-blue-300" href={s.meetingLink} target="_blank" rel="noopener noreferrer">Open meeting</a>}<p className="text-sm text-slate-600 dark:text-slate-300">{s.confirmationEligibility?.reason||"Open Swap Tracking to check confirmation availability."}{s.confirmationEligibility?.scheduledEndAt&&<> Scheduled end: <DateTimeText value={s.confirmationEligibility.scheduledEndAt} fallback="End time unavailable"/>.</>}</p><Link className="inline-block text-sm text-blue-700 underline dark:text-blue-300" to={`/swap-details/${s.swapId}`}>View exchange and confirmations</Link></article>)}
        </section>
      </>}
    </div>
  </main>;
}
