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

  useEffect(() => { fetchDetails(); }, [swapId]);

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
    if (isUpdating || swap.completedSessions >= swap.sessions) return;
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

  if (!swap) return <div className="p-10 text-center text-blue-400 font-bold italic uppercase">Syncing Session...</div>;

  const isCompleted = swap.status === "COMPLETED";
  const displaySessions = Math.min(swap.completedSessions, swap.sessions);
  const progress = (displaySessions / swap.sessions) * 100;

  return (
    <div className="min-h-screen bg-blue-50/30 p-4 pb-24 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="text-blue-600 font-bold" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 size-4" /> Hub
          </Button>
          
          {/* 🚀 QUICK CHAT BUTTON IN HEADER */}
          <Button 
            variant="outline" 
            className="border-blue-200 text-blue-600 rounded-xl font-black text-xs uppercase"
            onClick={() => navigate(`/chat?partnerId=${swap?.partner?.id}`)}
          >
            <MessageSquare className="mr-2 size-4" /> Message Peer
          </Button>
        </div>
        
        <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-blue-50 p-6">
            <div className="flex justify-between items-start">
              <CardTitle className="text-blue-900 font-black uppercase tracking-tighter italic text-2xl">
                Active Rotation
              </CardTitle>
              <Badge className="bg-blue-50 text-blue-600 border-blue-100 uppercase font-black text-[10px]">
                {swap.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Progress Tracker</p>
                  <span className="text-4xl font-black text-blue-900 tracking-tighter italic">
                    {displaySessions} / {swap.sessions} <span className="text-sm font-normal text-blue-300">Sessions</span>
                  </span>
                </div>
                <div className="bg-blue-600 text-white font-black px-3 py-1 rounded-lg text-sm mb-1 italic">
                  {Math.round(progress)}%
                </div>
              </div>
              <Progress value={progress} className="h-4 bg-blue-50 rounded-full" />
            </div>

            <div className="pt-6 border-t border-blue-50">
              {isCompleted ? (
                <div className="text-center p-8 bg-emerald-50 rounded-2xl border-2 border-emerald-100 space-y-4">
                  <Award className="size-16 text-emerald-500 mx-auto" />
                  <h3 className="font-black text-emerald-900 uppercase italic">Rotation Finalized</h3>
                  <Button className="w-full bg-emerald-600 text-white font-bold h-12 rounded-xl" onClick={() => navigate("/dashboard")}>
                    Return Home
                  </Button>
                </div>
              ) : displaySessions >= swap.sessions ? (
                <div className="text-center p-8 bg-blue-50 rounded-2xl border-2 border-blue-100 space-y-4">
                  <Star className="size-16 text-blue-500 mx-auto fill-blue-500" />
                  <h3 className="font-black text-blue-900 uppercase italic">Review Required</h3>
                  <Button 
                    className="w-full bg-blue-600 text-white font-black h-14 rounded-xl shadow-lg shadow-blue-200 uppercase" 
                    onClick={() => navigate(`/reputation?partnerId=${swap?.partner?.id}&swapId=${swap.id}`)}
                  >
                    Evaluate Peer <Award className="ml-2 size-5" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-2xl shadow-lg shadow-blue-100 text-lg uppercase" 
                    onClick={logSession} 
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className="animate-spin" /> : "Log Completed Session"}
                  </Button>

                  {/* 🚀 CONTEXTUAL CHAT CALL TO ACTION */}
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-dashed border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <MessageSquare className="size-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Coordination</p>
                        <p className="text-xs font-bold text-blue-900">Need to schedule a meeting?</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="text-blue-600 font-black text-xs uppercase hover:bg-blue-100"
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

      {/* FOOTER PLACEHOLDER TO MATCH DASHBOARD */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-blue-100 p-3">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 italic">
            Knoxite.org — Connected Learning Hub
          </p>
        </div>
      </footer>
    </div>
  );
}