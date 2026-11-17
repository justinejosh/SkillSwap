import { ExchangeSummary } from "@/app/components/ExchangeSummary";
import { authenticatedFetch } from "@/app/lib/api";
import { api } from "@/app/lib/api";
import { useState } from "react";
import { useLiveSwap } from "@/app/lib/useLiveSwap";
import { useParams, useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import {
  ArrowLeft,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function SwapDetailsPage() {
  const { swapId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const { swap, loading, error: syncError, refresh: fetchDetails } = useLiveSwap(swapId);
  const [isUpdating, setIsUpdating] = useState(false);
  const currentUser = swap?.me;

  const logSession = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setError("");
    try {
      const token = localStorage.getItem("knoxite_token");
      const res = await authenticatedFetch(`${API_BASE_URL}/swaps/${swapId}/log-session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "bypass-tunnel-reminder": "true",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionNumber:
            (swap.requesterId === currentUser.id
              ? swap.requesterSessions
              : swap.receiverSessions) + 1,
        }),
      });
      if (res.ok) {
        await fetchDetails();
      } else {
        const data = await res.json();
        setError(data.error || "Session confirmation failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to confirm your session. Please retry.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!swap || !currentUser) {
    return (
      <div className="flex flex-col h-screen items-center justify-center knoxite-surface">
        <Loader2 className="size-8 text-blue-600 animate-spin mb-3" />
        <span className="text-slate-900 dark:text-slate-100 font-bold text-xs uppercase tracking-widest">
          {error || syncError || "Loading exchange..."}
        </span>
        {!loading && <Button variant="outline" onClick={()=>void fetchDetails()}>Refresh</Button>}
      </div>
    );
  }

  // Bilateral Logic Assessment
  const isRequester = swap.requesterId === currentUser.id;
  const mySessions = isRequester
    ? swap.requesterSessions
    : swap.receiverSessions;
  const partnerSessions = isRequester
    ? swap.receiverSessions
    : swap.requesterSessions;
  const isCompleted = swap.status === "COMPLETED";

  const iAmDone = mySessions >= swap.sessions;
  const partnerIsDone = partnerSessions >= swap.sessions;
  const readyToReview = swap.canReview === true;
  const ownReview = swap.reviewSummary?.myReview;

  const active = ["PENDING_AGREEMENT", "CONFIRMED"].includes(swap.status);
  const statusTitle = isCompleted ? "Exchange completed" : swap.status === "CANCELLED" ? "Exchange cancelled" : swap.status === "PENDING_AGREEMENT" ? "Agreement awaiting approval" : swap.status !== "CONFIRMED" ? "Exchange is read-only" : ownReview ? "Your review submitted" : iAmDone && partnerIsDone ? "Both Students Confirmed Their Sessions" : iAmDone ? "Waiting for your partner's confirmations" : "Exchange in progress";
  const statusMessage = isCompleted ? "Both students have submitted their reviews. Your exchange and agreement remain available in history." : swap.status === "CANCELLED" ? "No further sessions or reviews can be added. Your exchange history is retained." : swap.status === "PENDING_AGREEMENT" ? "Both students must approve the same agreement before sessions begin." : swap.status !== "CONFIRMED" ? "View the saved agreement for this exchange. Contact an administrator if its status needs review." : ownReview ? "Your review is saved. The exchange completes after both reviews are recorded." : iAmDone && partnerIsDone ? "You can now rate your partner. The exchange completes after both reviews are recorded." : iAmDone ? "You have confirmed all required sessions. Your partner still needs to confirm theirs." : "Confirm each session after participating. Your partner records their own confirmations separately.";
  return (
    <div className="knoxite-surface min-h-screen pb-8 text-slate-900 dark:text-slate-100">
      <header className="mx-auto flex w-full max-w-[800px] flex-wrap items-center justify-between gap-3 px-4 pt-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="icon" onClick={()=>navigate("/dashboard")} aria-label="Back to Dashboard"><ArrowLeft className="size-4" /></Button>
          <div><p className="text-xs font-bold text-blue-700 dark:text-blue-300">KNOXITE</p><h1 className="text-2xl font-bold">Swap Tracking</h1></div>
        </div>
        {active && <Button variant="outline" onClick={()=>navigate(`/chat?partnerId=${swap.partner.id}&swapId=${swap.id}`)}><MessageSquare className="mr-2 size-4" />Message</Button>}
      </header>
      <main className="mx-auto w-full max-w-[800px] space-y-5 px-4 pt-6 sm:px-6">
        {(error||syncError)&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">{error||syncError}</p>}
        <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardContent className="space-y-6 p-5 sm:p-6">
            <ExchangeSummary swap={swap} />
            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
              <Button variant="outline" onClick={()=>navigate(`/swap-agreement/${swap.id}`)}>{swap.status==="PENDING_AGREEMENT"?"Review Agreement":"View Agreement"}</Button>
              {swap.status==="CONFIRMED"&&swap.integrityVerified&&<Button variant="outline" onClick={()=>navigate(`/calendar?swapId=${swap.id}`)}>Schedule Sessions</Button>}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardHeader className="pb-4"><h2 className="text-lg font-bold">Session confirmations</h2><p className="text-sm text-slate-600 dark:text-slate-300">Each student records their own confirmations. These counts are separate from peer reviews.</p></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {[{title:"Your Confirmations",count:mySessions,name:currentUser.name},{title:"Partner Confirmations",count:partnerSessions,name:swap.partner?.name}].map(({title,count,name})=><section key={title} aria-label={title} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <h3 className="text-sm font-semibold">{title}</h3><p className="min-h-10 break-words text-sm text-slate-600 dark:text-slate-300">{name}</p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{count}<span className="ml-1 text-sm font-medium text-slate-600 dark:text-slate-300">/ {swap.sessions}</span></p>
                <Progress aria-label={title} value={swap.sessions>0?(count/swap.sessions)*100:0} className="h-2 bg-blue-100 dark:bg-slate-700 [&>div]:bg-blue-600 dark:[&>div]:bg-blue-400" />
                <p className="text-xs text-slate-600 dark:text-slate-300">{count>=swap.sessions?"All confirmations recorded":active?"Confirmations still pending":"Recorded confirmations at closure"}</p>
              </section>)}
            </div>
            <section role="status" className="space-y-2 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100"><h3 className="font-semibold">{statusTitle}</h3><p className="text-sm">{statusMessage}</p></section>
            <div className="flex flex-wrap gap-3">
              {swap.status==="PENDING_AGREEMENT"&&<Button onClick={()=>navigate(`/swap-agreement/${swap.id}`)}>Review and Approve Agreement</Button>}
              {swap.status==="CONFIRMED"&&swap.integrityVerified&&!iAmDone&&<Button disabled={isUpdating||!!syncError||swap.confirmationEligibility?.eligible!==true} onClick={logSession}>{isUpdating?"Saving confirmation...":`Confirm Session ${mySessions+1}`}</Button>}
              {readyToReview&&<Button disabled={!!syncError} onClick={()=>navigate(`/reputation?swapId=${swap.id}&partnerId=${swap.partner.id}`)}>Rate Your Swap Partner</Button>}
              {ownReview&&<Button variant="outline" onClick={()=>navigate(`/reputation?swapId=${swap.id}`)}>View Your Review</Button>}
              <Button variant="outline" onClick={()=>void fetchDetails()}>Refresh status</Button>
            </div>
            {swap.status==="CONFIRMED"&&!iAmDone&&<p className="text-sm text-slate-600 dark:text-slate-300">{swap.confirmationEligibility?.reason||"Refresh status to check when this session can be confirmed."}{swap.confirmationEligibility?.scheduledEndAt&&<> Scheduled end: <time dateTime={swap.confirmationEligibility.scheduledEndAt}>{new Date(swap.confirmationEligibility.scheduledEndAt).toLocaleString()}</time>.</>}</p>}
          </CardContent>
        </Card>
        {active&&<section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700"><p className="text-sm text-slate-600 dark:text-slate-300">Need to end this exchange? Its history will be kept.</p><Button variant="outline" disabled={isUpdating||!!syncError} className="border-red-200 text-red-700 dark:border-red-800 dark:text-red-300" onClick={async()=>{if(!window.confirm("Cancel this exchange? Its history will be retained."))return;setIsUpdating(true);setError("");try{await api(`/swaps/cancel/swap/${swap.id}`,{method:"DELETE"});await fetchDetails();}catch(e){setError(e instanceof Error?e.message:"Unable to cancel this exchange.");}finally{setIsUpdating(false);}}}>Cancel Exchange</Button></section>}
      </main>
    </div>
  );
}
