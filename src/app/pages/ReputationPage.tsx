import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "@/app/lib/api";
import { useLiveSwap } from "@/app/lib/useLiveSwap";
import { Button } from "@/app/components/ui/button";
import { Star, Loader2 } from "lucide-react";

export default function ReputationPage() {
  const [params] = useSearchParams();
  const swapId=params.get("swapId");
  const {swap,loading,error:loadError,refresh}=useLiveSwap(swapId);
  const [rating,setRating]=useState(0),[comment,setComment]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState<any>(null);
  useEffect(()=>{setSaved(null);setRating(0);setComment("");setError("");},[swapId]);
  const ownReview=swap?.reviewSummary?.myReview || saved;
  const completed=swap?.status==="COMPLETED";
  const canReview=swap?.canReview===true && !ownReview && !loadError;
  async function submit(event:FormEvent){
    event.preventDefault();if(busy||!canReview)return;
    setError("");
    if(!Number.isInteger(rating)||rating<1||rating>5){setError("Choose a rating from one to five.");return;}
    if(comment.trim().length>2000){setError("Keep your comment within 2,000 characters.");return;}
    setBusy(true);
    try{
      const latest=await refresh();
      if(!latest){setError("Unable to check the latest review status. Please retry.");return;}
      if(!latest.canReview){setError(latest.reviewSummary?.myReview?"Your review has already been submitted.":"This exchange is not ready for a review.");return;}
      const result=await api("/reputation/submit",{method:"POST",body:JSON.stringify({swapId,rating,comment,partnerId:latest.partner.id})});
      setSaved(result);await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Your review could not be saved.");await refresh();}
    finally{setBusy(false);}
  }
  return <main className="min-h-screen knoxite-surface p-4 text-slate-900 dark:text-slate-100">
    <div className="mx-auto max-w-xl space-y-5 py-6">
      <Link to={swapId?`/swap-details/${swapId}`:"/dashboard"} className="text-sm font-semibold text-blue-700 underline dark:text-blue-300">Back to Exchange</Link>
      <section className="rounded-3xl border border-slate-200 border-b-4 border-b-blue-600 bg-white p-6 shadow-sm dark:border-slate-700 dark:border-b-blue-500 dark:bg-slate-900 sm:p-8">
        <h1 className="text-2xl font-bold text-blue-900 dark:text-blue-100">Rate Your Swap Partner</h1>
        {swap?.partner&&<p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-300">Your exchange with {swap.partner.name}</p>}
        {(error||loadError)&&<p role="alert" className="my-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">{error||loadError}</p>}
        {loading?<p role="status" className="mt-5">Loading your review status...</p>:ownReview?<div className="mt-5 space-y-4">
          <h2 className="text-lg font-semibold">Your review submitted</h2>
          <p>{ownReview.rating}/5 stars</p>
          {ownReview.comment&&<p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 dark:bg-slate-800">{ownReview.comment}</p>}
          <p role="status">{loadError?"Your review is saved. Refresh to check the exchange status.":completed?"Exchange completed. Both students have submitted their reviews.":swap?.status==="CONFIRMED"?swap.reviewSummary?.partnerSubmitted?"Both reviews are recorded. Completion is awaiting confirmation.":"Waiting for your partner's review. Your review is saved.":"Your review is saved. This exchange is closed."}</p>
          {ownReview.isValidated===false&&<p className="text-sm">This historical review is awaiting validation. Contact an administrator if you need help.</p>}
        </div>:canReview?<form onSubmit={submit} className="mt-6 space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">Both students have confirmed their sessions. Submit your own review; the exchange completes after both reviews are recorded.</p>
          <fieldset disabled={busy} className="space-y-3">
            <legend className="font-semibold">Your rating (1–5)</legend>
            <div className="flex flex-wrap gap-3">
              {[1,2,3,4,5].map(num=><label key={num} className="cursor-pointer rounded-lg">
                <input type="radio" name="rating" required value={num} checked={rating===num} onChange={()=>setRating(num)} aria-label={`${num} out of 5 stars`} className="peer sr-only" />
                <Star aria-hidden="true" className={`size-10 rounded-md p-1 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 dark:peer-focus-visible:outline-blue-300 ${rating>=num?"fill-amber-400 text-amber-600 dark:text-amber-300":"text-slate-500 dark:text-slate-400"}`} />
              </label>)}
            </div>
          </fieldset>
          <div className="space-y-2">
            <label htmlFor="evaluation-comment" className="block font-semibold">Comment <span className="font-normal">(optional)</span></label>
            <textarea id="evaluation-comment" maxLength={2000} disabled={busy} aria-describedby="evaluation-limit" value={comment} onChange={e=>setComment(e.target.value)} placeholder="What went well? What could be improved?" className="min-h-36 w-full rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus-visible:outline-blue-300" />
            <p id="evaluation-limit" className="text-xs text-slate-600 dark:text-slate-400">{comment.length}/2,000 characters</p>
          </div>
          <Button type="submit" disabled={busy||rating<1} className="w-full bg-blue-600 text-white hover:bg-blue-700">{busy?<><Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />Saving review...</>:"Submit Review"}</Button>
        </form>:<p role="status" className="mt-5">{completed?"Exchange completed. No review from you is recorded for this historical exchange.":swap?.status==="CONFIRMED"?"Reviews become available after both students confirm all required sessions.":swap?.status==="PENDING_AGREEMENT"?"Approve the agreement and complete your sessions before reviewing.":"Reviews are closed for this exchange."}</p>}
        {!loading&&<Button variant="outline" className="mt-5" onClick={()=>void refresh()}>Refresh status</Button>}
      </section>
    </div>
  </main>;
}
