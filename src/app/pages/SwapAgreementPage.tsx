import { ExchangeSummary } from "@/app/components/ExchangeSummary";
import { api } from "@/app/lib/api";
import { useLiveSwap } from "@/app/lib/useLiveSwap";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ArrowLeft, Check, Loader2, Repeat } from "lucide-react";

export default function SwapAgreementPage() {
  const navigate = useNavigate();
  const { swapId } = useParams();
  const { swap, loading: isLoading, error: syncError, refresh } = useLiveSwap(swapId);
  const [step, setStep] = useState(1);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreement, setAgreement] = useState({skillA:"",skillB:"",duration:"1",sessions:"4",agreedToTerms:false});
  const agreementVersion = swap?.agreementVersion;
  const requester = swap?.requesterId === swap?.me?.id;
  const participants = { me: swap?.me || {}, partner: swap?.partner || {} };
  const myApproval = requester ? swap?.requesterApprovedAt : swap?.receiverApprovedAt;
  const theirApproval = requester ? swap?.receiverApprovedAt : swap?.requesterApprovedAt;
  const approvalNotice = myApproval
    ? "Your approval is saved. Waiting for your partner to approve these terms."
    : theirApproval ? "Your partner approved these terms. Review them before adding your approval."
    : "Both students must approve the same terms. Changing pending terms clears earlier approvals.";
  useEffect(() => {
    if (!swap) return;
    setAgreement({duration:String(swap.duration),sessions:String(swap.sessions),agreedToTerms:false,
      skillA:requester?swap.offeredSkill.name:swap.wantedSkill.name,
      skillB:requester?swap.wantedSkill.name:swap.offeredSkill.name});
  }, [swap?.id, swap?.agreementVersion, swap?.status]);
  const canEdit = swap?.status === "PENDING_AGREEMENT" && swap.integrityVerified === true && !syncError;
  const handleSubmit = async () => {
    if (isSubmitting) return;
    setDebugError(null); setNotice("");
    if (!canEdit || !agreement.agreedToTerms) {setDebugError("Review the current agreement and accept the commitment before signing.");return;}
    const duration=Number(agreement.duration), sessions=Number(agreement.sessions);
    if (!Number.isInteger(duration)||duration<1||duration>8||!Number.isInteger(sessions)||sessions<1||sessions>30) {setDebugError("Choose 1–8 hours per session and 1–30 sessions.");return;}
    setIsSubmitting(true);
    try {
      const latest=await refresh();
      if (!latest) {setDebugError("Unable to check the latest terms. Refresh before signing.");return;}
      if (latest.status!=="PENDING_AGREEMENT" || latest.agreementVersion!==agreementVersion) {setDebugError("This agreement changed. Review its latest status and terms before continuing.");return;}
      const result=await api(`/swaps/${swapId}/agreement`,{method:"POST",body:JSON.stringify({duration,sessions,agreementVersion,agreedToTerms:true})});
      setNotice(result.message);await refresh();
    } catch(e) {setDebugError(e instanceof Error?e.message:"Your approval could not be saved.");await refresh();}
    finally {setIsSubmitting(false);}
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center knoxite-surface">
        <Loader2 className="animate-spin text-blue-600 size-8 mb-3" />
        <span className="text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-widest">
          Loading Swap Agreement...
        </span>
      </div>
    );
  }

  if (!swap || !canEdit) {
    return <main className="knoxite-surface min-h-screen p-4 text-slate-900 dark:text-slate-100 sm:p-6">
      <div className="mx-auto max-w-[800px] space-y-5 py-3">
        <Button variant="outline" onClick={()=>navigate(swap ? `/swap-details/${swap.id}` : "/dashboard")}>Back to Swap Tracking</Button>
        <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700"><h1 className="text-2xl font-bold">Skill Swap Agreement</h1><p className="text-sm text-slate-600 dark:text-slate-300">Saved terms and participant approvals</p></CardHeader>
          <CardContent className="space-y-6 pt-6">
            {(syncError||debugError)&&<p role="alert" className="text-red-700 dark:text-red-300">{syncError||debugError}</p>}
            {notice&&<p role="status">{notice}</p>}
            {swap&&<>
              <ExchangeSummary swap={swap} />
              <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">{swap.status==="CONFIRMED" ? "Agreement confirmed. Your exchange is still in progress; these terms are read-only." : swap.status==="COMPLETED" ? "Exchange completed. Your agreement and approvals are kept for your records." : swap.status==="CANCELLED" ? "Exchange cancelled. The saved terms and approvals remain available." : "This agreement is read-only. Contact an administrator if its status needs review."}</p>
              <section aria-label="Recorded agreement approvals" className="space-y-3">
                <h2 className="text-lg font-semibold">Participant approvals</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">Agreement version {swap.agreementVersion}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[{person:swap.requester,at:swap.requesterApprovedAt},{person:swap.receiver,at:swap.receiverApprovedAt}].map(({person,at},i)=><div key={i} className="min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><p className="break-words font-semibold">{person?.name||"Participant"}</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{at?<span>Approved <time dateTime={at}>{new Date(at).toLocaleString()}</time></span>:"Approval not recorded"}</p></div>)}
                </div>
              </section>
            </>}
            <Button variant="outline" onClick={()=>void refresh()}>Refresh</Button>
          </CardContent>
        </Card>
      </div>
    </main>;
  }

  return (
    <div className="min-h-screen knoxite-surface text-slate-900 dark:text-slate-100 font-sans pb-20 flex flex-col relative overflow-x-hidden transition-colors duration-200">

      {/* FLOATING GLASS HEADER */}
      <div className="sticky top-4 z-30 px-4 sm:px-6">
        <header className="max-w-xl mx-auto flex items-center justify-between px-4 sm:px-5 py-3.5 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="size-9 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 transition-colors shrink-0"
              title="Return"
            >
              <ArrowLeft className="size-5" />
            </Button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-0.5" />

            <div
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="size-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-600/25">
                K
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Review Agreement
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Step {step} of 3
                </span>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-xl mx-auto w-full px-4 pt-8 space-y-6 relative z-10">
        {(debugError || syncError) && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 p-3.5 rounded-2xl text-xs space-y-1">
            <strong className="font-bold">Please check:</strong> {debugError || syncError}
          </div>
        )}

        {notice && <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">{notice}</p>}
        {/* STEPPER PROGRESS BAR */}
        <div className="relative flex items-center justify-between px-6 py-2">
          <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
          <div
            className="absolute left-10 top-1/2 -translate-y-1/2 h-0.5 bg-blue-600 transition-all duration-300 z-0"
            style={{ width: `${((step - 1) / 2) * 80}%` }}
          />

          {[
            { num: 1, label: "Parties" },
            { num: 2, label: "Logistics" },
            { num: 3, label: "Commitment" },
          ].map((s) => {
            const isCompleted = s.num < step;
            const isActive = s.num === step;

            return (
              <div
                key={s.num}
                className="relative z-10 flex flex-col items-center"
              >
                <div
                  className={`size-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                    isCompleted
                      ? "bg-blue-600 text-white"
                      : isActive
                        ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50"
                        : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {isCompleted ? <Check className="size-4" /> : s.num}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* STEP 1: PARTICIPANTS */}
        {step === 1 && (
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-slate-900 dark:text-white text-base font-bold">
                Exchange Participants
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Check who you will exchange skills with.
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* YOU */}
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                <Avatar className="size-12 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                  <AvatarImage
                    src={
                      participants.me.avatarUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${participants.me.name}`
                    }
                  />
                  <AvatarFallback className="bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl text-xs">
                    {participants.me.name?.[0] || "Y"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 block">
                    You
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm break-words mt-0.5">
                    {participants.me.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {participants.me.headline}
                  </p>
                </div>
              </div>

              {/* Bilateral Trade Connector */}
              <div className="flex items-center justify-center">
                <div className="size-8 rounded-full bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                  <Repeat className="size-3.5" />
                </div>
              </div>

              {/* PARTNER */}
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800">
                <Avatar className="size-12 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                  <AvatarImage
                    src={
                      participants.partner.avatarUrl ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${participants.partner.name}`
                    }
                  />
                  <AvatarFallback className="bg-blue-600 text-white font-bold rounded-xl text-xs">
                    {participants.partner.name?.[0] || "P"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
                    Peer Partner
                  </span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm break-words mt-0.5">
                    {participants.partner.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {participants.partner.headline}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {approvalNotice && (
          <p
            role="status"
            className="rounded-xl border bg-white p-4 text-sm dark:bg-slate-900"
          >
            {approvalNotice}
          </p>
        )}
        {/* STEP 2: SWAP LOGISTICS */}
        {step === 2 && (
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs rounded-3xl bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-slate-900 dark:text-white text-base font-bold">
                Session Plan
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Confirm session duration and target swap commitments.
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                    You Teach
                  </Label>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 block">
                    {agreement.skillA}
                  </span>
                </div>
                <div className="border-t border-slate-200/60 dark:border-slate-800 pt-3 space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                    You Learn
                  </Label>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 block">
                    {agreement.skillB}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="agreement-duration" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Hours Per Session
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    id="agreement-duration"
                    value={agreement.duration}
                    onChange={(e) =>
                      setAgreement({ ...agreement, duration: e.target.value, agreedToTerms: false })
                    }
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="agreement-sessions" className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Total Sessions
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    id="agreement-sessions"
                    value={agreement.sessions}
                    onChange={(e) =>
                      setAgreement({ ...agreement, sessions: e.target.value, agreedToTerms: false })
                    }
                    className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="bg-slate-900 dark:bg-slate-800 text-white p-4 rounded-2xl mt-4 text-center space-y-0.5 border border-transparent dark:border-slate-700">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  Mutual Time Commitment
                </p>
                <p className="text-2xl font-black">
                  {Number(agreement.sessions) * Number(agreement.duration)}{" "}
                  Hours Total
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: OATH */}
        {step === 3 && (
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs rounded-3xl bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <CardTitle className="text-slate-900 dark:text-white text-base font-bold">
                Your Swap Commitment
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Honor-code commitment to uphold mutual accountability and
                fairness.
              </p>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 max-h-48 overflow-y-auto leading-relaxed">
                <p>
                  <strong>1. Reliability:</strong> I will arrive at scheduled
                  peer sessions promptly and prepared.
                </p>
                <p>
                  <strong>2. Reciprocity:</strong> I will provide authentic,
                  high-quality instruction in exchange for learning.
                </p>
                <p>
                  <strong>3. Respect:</strong> I will foster a constructive,
                  safe, and professional academic environment.
                </p>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="terms"
                  checked={agreement.agreedToTerms}
                  onCheckedChange={(c) =>
                    setAgreement({ ...agreement, agreedToTerms: !!c })
                  }
                  className="rounded-md border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 mt-0.5"
                />
                <Label
                  htmlFor="terms"
                  className="text-xs text-slate-700 dark:text-slate-300 leading-snug cursor-pointer select-none font-medium"
                >
                  I commit to this bilateral skill exchange and agree to uphold
                  all community accountability guidelines.
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Previous Step
            </Button>
          )}
          <Button
            onClick={step === 3 ? handleSubmit : () => setStep(step + 1)}
            disabled={isSubmitting || (step === 3 && !agreement.agreedToTerms)}
            className="flex-[2] h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20"
          >
            {isSubmitting ? "Saving approval..." : step === 3 ? "Sign Bilateral Agreement" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
