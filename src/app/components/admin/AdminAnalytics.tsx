import { Table2 } from "lucide-react";
import { Button } from "../ui/button";
import { useId, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { countLabel } from "./AdminUI";
export const adminCategories=["technology","creative","music","language","lifestyle","business","academic","other"];
export type SkillTrend={key:string;name:string;category:string;supply:number|null;demand:number|null;availability?:string};
export function skillRows(rows:SkillTrend[],category:string,search:string,sort:string) {
  const number=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;
  return rows.filter(r=>(!category||r.category===category)&&r.name.toLowerCase().includes(search.trim().toLowerCase())).map(r=>{const supply=number(r.supply),demand=number(r.demand);return{...r,supply,demand,shortage:supply===null||demand===null?null:demand-supply};}).sort((a,b)=>{
    const name=a.name.localeCompare(b.name)||a.key.localeCompare(b.key);if(sort==="alphabetical")return name;
    const av=sort==="supply"?a.supply:sort==="shortage"?a.shortage:a.demand,bv=sort==="supply"?b.supply:sort==="shortage"?b.shortage:b.demand;
    return av===null?(bv===null?name:1):bv===null?-1:bv-av||name;
  });
}
const tooltipStyle={backgroundColor:"var(--card)",color:"var(--card-foreground)",borderColor:"var(--border)",borderRadius:12};
function SkillTick({ x, y, payload, rows }: any) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const row = rows.find((r: SkillTrend) => r.name === payload.value);
  const counts = `Supply: ${countLabel(row?.supply)}; Demand: ${countLabel(row?.demand)}`;
  const words = String(payload.value).split(" ");
  const lines: string[] = [];
  for (const word of words) {
    if (!lines.length || lines[lines.length - 1].length + word.length > 27) lines.push(word);
    else lines[lines.length - 1] += " " + word;
  }
  return <g tabIndex={0} role="img" aria-label={payload.value} aria-describedby={open ? tooltipId : undefined}
    onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
    onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
    onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}>
    <text x={x - 8} y={y - (lines.length - 1) * 7} textAnchor="end" fill="currentColor" fontSize={12}>
      {lines.map((line, i) => <tspan key={i} x={x - 8} dy={i ? 15 : 0}>{line}</tspan>)}
    </text>
    {open && <g id={tooltipId} role="tooltip" pointerEvents="none">
      <rect x={x + 8} y={y - 19} width={265} height={38} rx={6} fill="var(--card)" stroke="var(--border)" />
      <text x={x + 18} y={y + 4} fill="var(--card-foreground)" fontSize={12}>{counts}</text>
    </g>}
  </g>;
}
export function AdminAnalytics({data}:{data:any}) {
  const tableId=useId();const [showTable,setShowTable]=useState(false);
  const [category,setCategory]=useState(""),[search,setSearch]=useState(""),[sort,setSort]=useState("demand"),[limit,setLimit]=useState("10"),[months,setMonths]=useState("6");
  const rows=useMemo(()=>skillRows(data?.skillTrends?.catalog||[],category,search,sort),[data,category,search,sort]);
  const shown=limit==="all"?rows:rows.slice(0,10),monthly=(data?.monthlyCompletion||[]).slice(-Number(months));
  return <div className="space-y-5">
    <section className="admin-panel space-y-4" aria-label="Skill Supply and Demand">
      <h2 className="text-lg font-bold">Skill Supply vs. Demand</h2><p className="text-sm text-slate-600 dark:text-slate-300">Active teaching links (blue) and wanted links (green). Each account has at most one link per skill in each direction; these are account-skill associations, including all account roles, not counts of eligible enrolled students.</p>
      <div className="admin-filters"><label>Skill category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All Categories</option>{adminCategories.map(c=><option key={c} value={c}>{c[0].toUpperCase()+c.slice(1)}</option>)}</select></label><label>Search skills<input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Sort skills<select value={sort} onChange={e=>setSort(e.target.value)}><option value="demand">Highest Demand</option><option value="supply">Highest Supply</option><option value="shortage">Largest Supply Shortage</option><option value="alphabetical">Alphabetical</option></select></label><label>Entries shown<select value={limit} onChange={e=>setLimit(e.target.value)}><option value="10">Top 10</option><option value="all">All matching skills</option></select></label></div>
      <p className="text-xs text-slate-600 dark:text-slate-300">Shortage = demand − supply. Positive: more wanted links; zero: equal counts; negative: more teaching links. This is an association-count comparison, not proof that specific students can form reciprocal matches.</p>
      {!data?.skillTrends?.catalog?<p role="status">Complete catalog analytics are unavailable. Load the updated backend; partial top-five lists are not treated as a complete catalog.</p>:!shown.length?<p role="status">No skills match these filters.</p>:<>
        <p className="text-sm">Showing {shown.length} of {rows.length} matching preset skills.</p><div className="admin-legend flex flex-wrap gap-4 text-sm"><span className="text-blue-700 dark:text-blue-300">■ Supply — active teaching links</span><span className="text-emerald-700 dark:text-emerald-300">■ Demand — wanted links</span></div>
        <p className="text-xs text-slate-600 dark:text-slate-300">Scroll horizontally on small screens. Hover or focus a skill label for counts, or open the data table below.</p><div className="admin-chart-frame admin-scroll max-h-[850px]" tabIndex={0} aria-label="Scroll supply and demand chart"><div className="min-w-[620px]" style={{height:shown.length*78+50}}><ResponsiveContainer width="100%" height="100%"><BarChart data={shown} layout="vertical" accessibilityLayer aria-label="Skill supply and demand chart" margin={{left:0,right:35,top:5,bottom:20}}><CartesianGrid horizontal={false} stroke="var(--border)"/><XAxis type="number" allowDecimals={false} domain={[0,"auto"]} tick={{fill:"currentColor",fontSize:12}} label={{value:"Account-skill links",position:"insideBottom",offset:-12,fill:"currentColor"}}/><YAxis type="category" dataKey="name" width={220} tick={<SkillTick rows={shown}/>} interval={0}/><Tooltip contentStyle={tooltipStyle} cursor={{fill:"rgb(59 130 246 / 6%)"}}/><Bar dataKey="supply" name="Supply" fill="#2563eb" radius={[0,4,4,0]} isAnimationActive={false}/><Bar dataKey="demand" name="Demand" fill="#059669" radius={[0,4,4,0]} isAnimationActive={false}/></BarChart></ResponsiveContainer></div></div>
        <Button type="button" variant="outline" size="sm" aria-expanded={showTable} aria-controls={tableId} onClick={()=>setShowTable(value=>!value)}><Table2 className="size-4" aria-hidden="true"/>{showTable?"Hide Data Table":"View Data Table"}</Button><div id={tableId} hidden={!showTable}><div className="admin-scroll" tabIndex={0} aria-label="Scrollable data table"><table className="admin-table"><caption className="sr-only">Current filtered preset skill supply and demand</caption><thead><tr><th>Skill</th><th>Category</th><th>Supply</th><th>Demand</th><th>Shortage</th></tr></thead><tbody>{shown.map(r=><tr key={r.key}><td>{r.name}{r.availability&&r.availability!=="AVAILABLE"&&<p className="text-xs">{r.availability.replaceAll("_"," ")}</p>}</td><td className="capitalize">{r.category}</td><td>{countLabel(r.supply)}</td><td>{countLabel(r.demand)}</td><td>{r.shortage===null?"Unavailable":r.shortage>0?`+${r.shortage}`:r.shortage}</td></tr>)}</tbody></table></div></div>
      </>}
    </section>
    <section className="admin-panel space-y-4" aria-label="Monthly completion rates"><div className="flex flex-wrap items-end justify-between gap-3"><h2 className="text-lg font-bold">Monthly Swap Completion Rate</h2><label className="text-sm">Reporting period<select className="ml-2" value={months} onChange={e=>setMonths(e.target.value)}><option value="6">Last 6 months</option><option value="3">Last 3 months</option></select></label></div>
      <p className="text-sm text-slate-600 dark:text-slate-300">UTC calendar months. Rate = validated completions ÷ eligible concluded exchanges in that month. The denominator includes qualifying bilateral-agreement cancellations; it is not partner-balanced and does not change matching scores. All-time overview counts can exceed this six-month window.</p>
      {monthly.some((m:any)=>typeof m.rate==="number")?<div className="admin-chart-frame h-64 min-w-0"><ResponsiveContainer width="100%" height="100%"><LineChart data={monthly} accessibilityLayer aria-label="Monthly validated completion rates" margin={{left:0,right:20,bottom:5}}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="period" tick={{fill:"currentColor",fontSize:12}}/><YAxis domain={[0,100]} unit="%" tick={{fill:"currentColor",fontSize:12}}/><Tooltip contentStyle={tooltipStyle}/><Line type="linear" dataKey="rate" name="Completion rate (%)" stroke="#2563eb" dot={{r:5}} connectNulls={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div>:<p role="status">No validated completion rate is available in this reporting period. See the monthly evidence below.</p>}
      <div className="admin-scroll" tabIndex={0} aria-label="Scrollable data table"><table className="admin-table"><caption className="sr-only">Monthly completion evidence in UTC</caption><thead><tr><th>UTC month</th><th>Validated completed</th><th>Eligible concluded</th><th>Rate / evidence</th></tr></thead><tbody>{monthly.map((m:any)=><tr key={m.period} data-no-outcome={m.rate==null}><td>{m.period}</td><td>{countLabel(m.completed)}</td><td>{countLabel(m.eligibleConcluded)}</td><td>{typeof m.rate==="number"?`${m.rate.toFixed(1)}%`:m.eligibleConcluded===0?m.excludedConcluded?"No eligible outcomes; concluded records excluded":"No concluded exchanges in this month":"Rate not supplied; outcome details unavailable"}{m.excludedConcluded>0&&<p className="text-xs">{m.excludedConcluded} concluded outcomes excluded by the existing validation criteria.</p>}</td></tr>)}</tbody></table></div>
      {!monthly.length&&<p>No monthly records supplied.</p>}{data?.reporting?.undatedConcluded>0&&<p className="text-sm">{data.reporting.undatedConcluded} concluded exchanges have no outcome timestamp and cannot be assigned to a month.</p>}
      {data?.swapMetrics?.legacyConcludedSwaps>0&&<p className="text-sm">Overall completion evidence includes unresolved legacy records. Monthly rates cover eligible, dated outcomes only.</p>}
    </section>
  </div>;
}
