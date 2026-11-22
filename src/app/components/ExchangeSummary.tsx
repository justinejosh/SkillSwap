import { ReciprocalExchange } from "./ReciprocalExchange";
import { currentAccountId } from "@/app/lib/theme";

export function exchangeStatusLabel(status: string) {
  const labels: Record<string, string> = { PENDING_AGREEMENT: "Agreement awaiting approval", CONFIRMED: "Exchange in progress", COMPLETED: "Exchange completed", CANCELLED: "Exchange cancelled" };
  return labels[status] || status.replaceAll("_", " ");
}

export function ExchangeSummary({ swap }: { swap: any }) {
  const requester = swap.requesterId === (swap.me?.id || currentAccountId());
  const partner = requester ? swap.receiver : swap.requester;
  const learn = requester ? swap.wantedSkill : swap.offeredSkill;
  const teach = requester ? swap.offeredSkill : swap.wantedSkill;
  const agreed = !!swap.requesterApprovedAt && !!swap.receiverApprovedAt;
  const termsLabel = swap.status === "PENDING_AGREEMENT" ? "Proposed sessions" : agreed ? "Agreed sessions" : "Saved sessions";
  const badge = swap.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100" : swap.status === "CANCELLED" ? "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100";
  return <section aria-label="Exchange summary" className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Your swap partner</p><p className="break-words text-lg font-bold">{partner?.name || swap.partner?.name || "Partner"}</p></div>
      <span className={`self-start rounded-full border px-3 py-1 text-xs font-semibold sm:shrink-0 ${badge}`}>{exchangeStatusLabel(swap.status)}</span>
    </div>
    {learn && teach && <ReciprocalExchange learn={[learn]} teach={[teach]} />}
    <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/70 sm:grid-cols-3">
      <div><dt className="text-slate-600 dark:text-slate-300">{termsLabel}</dt><dd className="font-bold">{swap.sessions}</dd></div>
      {swap.duration != null ? <>
        <div><dt className="text-slate-600 dark:text-slate-300">Hours per session (historical terms)</dt><dd className="font-bold">{swap.duration}</dd></div>
        <div><dt className="text-slate-600 dark:text-slate-300">Historical time commitment</dt><dd className="font-bold">{swap.sessions * swap.duration} hours per student</dd></div>
      </> : <div className="col-span-2"><dt className="text-slate-600 dark:text-slate-300">Session times</dt><dd className="font-semibold">Schedule later. Arrange each session's start and end in the calendar.</dd></div>}
    </dl>
  </section>;
}
