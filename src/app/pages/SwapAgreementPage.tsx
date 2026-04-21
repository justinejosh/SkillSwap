import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function SwapAgreementPage() {
  const navigate = useNavigate();
  const { swapId } = useParams(); 
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [debugError, setDebugError] = useState<string | null>(null);
  
  const [participants, setParticipants] = useState<any>({
    me: { name: "You", headline: "Streetwear Enthusiast" },
    partner: { name: "Partner", headline: "Knoxite Member" }
  });
  
  const [agreement, setAgreement] = useState({
    skillA: "", 
    skillB: "", 
    duration: "1",
    sessions: "4",
    agreedToTerms: false,
  });

  useEffect(() => {
    if (swapId) fetchSwapDetails();
  }, [swapId]);

  const fetchSwapDetails = async () => {
    setIsLoading(true);
    setDebugError(null);
    const token = localStorage.getItem("knoxite_token") || localStorage.getItem("token");
    
    try {
      const response = await fetch(`${API_BASE_URL}/swaps/${swapId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        setDebugError(`Server Error: ${errorData.message || response.statusText}`);
        return;
      }

      const data = await response.json();

      setParticipants({
        me: data.me || { name: "You", headline: "Streetwear Enthusiast" },
        partner: data.partner || { name: "Partner", headline: "Knoxite Member" }
      });

      setAgreement(prev => ({
        ...prev,
        skillA: typeof data.offeredSkill === 'object' ? data.offeredSkill.name : data.offeredSkill || "Skill A",
        skillB: typeof data.wantedSkill === 'object' ? data.wantedSkill.name : data.wantedSkill || "Skill B"
      }));

    } catch (err: any) {
      setDebugError(`Network Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!agreement.agreedToTerms) {
      alert("Please agree to the Knoxite Oath first.");
      return;
    }

    try {
      const token = localStorage.getItem("knoxite_token") || localStorage.getItem("token");
      console.log("Submitting agreement for swap:", swapId);

      const response = await fetch(`${API_BASE_URL}/swaps/${swapId}/agreement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        // Sending the final logistics to the backend
        body: JSON.stringify({
          duration: agreement.duration,
          sessions: agreement.sessions,
          agreedToTerms: true
        })
      });

      if (response.ok) {
        console.log("Agreement signed successfully!");
        navigate("/dashboard");
      } else {
        const errorData = await response.json();
        alert(`Failed to sign: ${errorData.message || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error("Submit Error:", error);
      alert(`Network Error: ${error.message}. Check your server connection.`);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600 size-10" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 pb-10">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-blue-600">
            <ArrowLeft className="size-6" />
          </Button>
          <h1 className="text-lg font-bold text-blue-900">Finalize Swap</h1>
        </div>
      </header>

      <div className="max-w-xl mx-auto p-4 space-y-6">
        {debugError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-xs">
            <strong>Fetch Error:</strong> {debugError}
            <p className="mt-1">Make sure the ID in the URL matches Prisma Studio.</p>
          </div>
        )}

        {/* Stepper */}
        <div className="flex items-center justify-between px-6 relative">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`size-8 rounded-full flex items-center justify-center text-xs font-bold z-10 ${
              s <= step ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-400"
            }`}>
              {s < step ? <CheckCircle2 className="size-5" /> : s}
            </div>
          ))}
          <div className="absolute left-1/2 -translate-x-1/2 w-48 h-0.5 bg-blue-100 top-1/2 -translate-y-1/2" />
        </div>

        {/* Step 1: Participants */}
        {step === 1 && (
          <Card className="border-blue-100 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-blue-50/50">
              <CardTitle className="text-blue-900 text-base">Participants</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-blue-50">
                <Avatar className="size-12"><AvatarFallback>ME</AvatarFallback></Avatar>
                <div>
                  <p className="font-bold text-blue-900">{participants.me.name}</p>
                  <p className="text-xs text-blue-500">{participants.me.headline}</p>
                </div>
              </div>
              <div className="flex justify-center"><ArrowRight className="text-blue-200" /></div>
              <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-blue-50">
                <Avatar className="size-12">
                   <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${participants.partner.name}`} />
                   <AvatarFallback>{participants.partner.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-blue-900">{participants.partner.name}</p>
                  <p className="text-xs text-blue-500">{participants.partner.headline}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Swap Logistics */}
        {step === 2 && (
          <Card className="border-blue-100 shadow-sm rounded-2xl">
            <CardHeader><CardTitle className="text-blue-900 text-base">Swap Logistics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-blue-400 uppercase">You Teach</Label>
                  <Input value={agreement.skillA} readOnly className="bg-blue-50/50 border-blue-100 text-sm h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-blue-400 uppercase">You Learn</Label>
                  <Input value={agreement.skillB} readOnly className="bg-blue-50/50 border-blue-100 text-sm h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-blue-400 uppercase">Session Hrs</Label>
                  <Input type="number" value={agreement.duration} onChange={(e) => setAgreement({...agreement, duration: e.target.value})} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-blue-400 uppercase">Total Sessions</Label>
                  <Input type="number" value={agreement.sessions} onChange={(e) => setAgreement({...agreement, sessions: e.target.value})} className="h-11" />
                </div>
              </div>
              <div className="bg-blue-900 text-white p-4 rounded-xl mt-4 text-center">
                <p className="text-[10px] uppercase font-bold opacity-70">Mutual Time Investment</p>
                <p className="text-2xl font-black">{Number(agreement.sessions) * Number(agreement.duration)} Hours Total</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Terms */}
        {step === 3 && (
          <Card className="border-blue-100 shadow-sm rounded-2xl">
            <CardHeader><CardTitle className="text-blue-900 text-base">The Knoxite Oath</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs text-blue-800 space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100 h-48 overflow-y-auto">
                <p><strong>1. Reliability:</strong> I will show up to scheduled sessions on time.</p>
                <p><strong>2. Reciprocity:</strong> I will provide quality instruction in exchange for learning.</p>
                <p><strong>3. Respect:</strong> I will maintain a professional and safe learning environment.</p>
              </div>
              <div className="flex items-center space-x-3 pt-2">
                <Checkbox 
                  id="terms" 
                  checked={agreement.agreedToTerms} 
                  onCheckedChange={(c) => setAgreement({...agreement, agreedToTerms: !!c})} 
                />
                <Label htmlFor="terms" className="text-xs text-blue-900 leading-tight cursor-pointer">
                  I commit to this skill exchange and agree to the community guidelines.
                </Label>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-12 rounded-xl border-blue-200">Back</Button>}
          <Button 
            onClick={step === 3 ? handleSubmit : () => setStep(step + 1)} 
            disabled={step === 3 && !agreement.agreedToTerms}
            className="flex-[2] h-12 rounded-xl bg-blue-600 text-white font-bold"
          >
            {step === 3 ? "Sign Agreement" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}