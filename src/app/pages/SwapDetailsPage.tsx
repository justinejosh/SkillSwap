import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import { 
  ArrowLeft, CheckCircle2, MessageSquare, 
  Star, Award, Loader2, Send 
} from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function SwapDetailsPage() {
  const { swapId } = useParams();
  const navigate = useNavigate();
  const [swap, setSwap] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => { 
    const user = JSON.parse(localStorage.getItem("knoxite_user") || "{}");
    setCurrentUser(user);
    fetchDetails(); 
  }, [swapId]);

  const fetchDetails = async () => {
    try {
      const token = localStorage.getItem("knoxite_token");
      const res = await fetch(`${API_BASE_URL}/swaps/${swapId}`, { 
        headers: { "Authorization": `Bearer ${token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setSwap(data);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const logSession = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("knoxite_token");
      const res = await fetch(`${API_BASE_URL}/swaps/${swapId}/log-session`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchDetails();
      }
    } catch (err) {
      console.error("Log Session Error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!swap || !currentUser) return <div className="p-10 text-center text-slate-500 font-bold tracking-tight">Synchronizing Data...</div>;

  // Bilateral Logic Assessment
  const isRequester = swap.requesterId === currentUser.id;
  const mySessions = isRequester ? swap.requesterSessions : swap.receiverSessions;
  const partnerSessions = isRequester ? swap.receiverSessions : swap.requesterSessions;
  const isCompleted = swap.status === "COMPLETED";
  
  const iAmDone = mySessions >= swap.sessions;
  const partnerIsDone = partnerSessions >= swap.sessions;
  const readyToReview = iAmDone && partnerIsDone && !isCompleted;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="text-slate-600 font-bold" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 size-4" /> Hub
          </Button>
          
          <Button 
            variant="outline" 
            className="border-slate-200 text-blue-600 rounded-md font-bold text-xs"
            onClick={() => navigate(`/chat?partnerId=${swap?.partner?.id}`)}
          >
            <MessageSquare className="mr-2 size-4" /> Message Peer
          </Button>
        </div>
        
        <Card className="border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 p-6">
            <div className="flex justify-between items-start">
              <CardTitle className="text-slate-900 font-bold text-xl">
                Active Rotation
              </CardTitle>
              <Badge className="bg-blue-50 text-blue-700 border-none font-bold text-[10px] uppercase">
                {swap.status.replace("_", " ")}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            {/* BILATERAL PROGRESS BARS */}
            <div className="grid grid-cols-2 gap-4">
              {/* My Progress */}
              <div className="space-y-2 p-4 rounded-lg border border-slate-100 bg-slate-50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Validation</p>
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-bold text-blue-700">{mySessions}/{swap.sessions}</span>
                  {iAmDone && <CheckCircle2 className="size-5 text-emerald-500 mb-1" />}
                </div>
                <Progress value={(mySessions / swap.sessions) * 100} className="h-2 bg-blue-200" />
              </div>

              {/* Partner Progress */}
              <div className="space-y-2 p-4 rounded-lg border border-slate-100 bg-slate-50">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{swap.partner?.name}'s Validation</p>
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-bold text-slate-700">{partnerSessions}/{swap.sessions}</span>
                  {partnerIsDone && <CheckCircle2 className="size-5 text-emerald-500 mb-1" />}
                </div>
                <Progress value={(partnerSessions / swap.sessions) * 100} className="h-2 bg-slate-200" />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              {isCompleted ? (
                <div className="text-center p-6 bg-emerald-50 rounded-xl border border-emerald-100 space-y-4">
                  <Award className="size-12 text-emerald-600 mx-auto" />
                  <h3 className="font-bold text-emerald-900">Rotation Finalized & Verified</h3>
                  <Button className="w-full bg-emerald-600 text-white font-bold rounded-lg" onClick={() => navigate("/dashboard")}>
                    Return Home
                  </Button>
                </div>
              ) : readyToReview ? (
                <div className="text-center p-6 bg-amber-50 rounded-xl border border-amber-100 space-y-4">
                  <Star className="size-12 text-amber-500 mx-auto fill-amber-500" />
                  <h3 className="font-bold text-amber-900">Mutual Validation Complete</h3>
                  <p className="text-xs text-amber-700 font-medium">Both peers have confirmed the sessions. Proceed to final evaluation.</p>
                  <Button 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 rounded-lg" 
                    onClick={() => navigate(`/reputation?partnerId=${swap?.partner?.id}&swapId=${swap.id}`)}
                  >
                    Evaluate Peer <Award className="ml-2 size-5" />
                  </Button>
                </div>
              ) : iAmDone ? (
                <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
                  <Loader2 className="size-8 text-blue-500 animate-spin mx-auto mb-2" />
                  <h3 className="font-bold text-blue-900">Awaiting Partner Validation</h3>
                  <p className="text-xs text-blue-600 font-medium">You have logged all sessions. Waiting for {swap.partner?.name} to confirm their end of the exchange.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 rounded-lg text-sm uppercase tracking-wide shadow-sm" 
                    onClick={logSession} 
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className="animate-spin" /> : "Log Completed Session"}
                  </Button>

                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-md shadow-sm border border-slate-100">
                        <MessageSquare className="size-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Coordination</p>
                        <p className="text-xs font-bold text-slate-900">Need to schedule a meeting?</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="text-blue-600 font-bold text-xs uppercase hover:bg-blue-50"
                      onClick={() => navigate(`/chat?partnerId=${swap?.partner?.id}`)}
                    >
                      Chat Now <Send className="ml-2 size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Knoxite.org — Connected Learning Hub
          </p>
        </div>
      </footer>
    </div>
  );
}