import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { ArrowLeft, UserPlus, Star, AlertCircle, Zap, CheckCircle2, Loader2 } from "lucide-react";

// 1. IMPORT YOUR CONFIG
import { API_BASE_URL } from "@/config";

export default function KnoxHubPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [swapMessage, setSwapMessage] = useState("Hi! I saw we have matching skills. Would you be interested in swapping?");
  const [isRequesting, setIsRequesting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem("knoxite_token");
      if (!token) {
        navigate("/login");
        return;
      }

      // 2. USE API_BASE_URL AND TUNNEL BYPASS
      const response = await fetch(`${API_BASE_URL}/matches`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch matches.");
      }

      setMatches(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitSwapRequest = async () => {
    if (!selectedMatch) return;
    setIsRequesting(true);

    try {
      const token = localStorage.getItem("knoxite_token");
      
      const targetWantedSkillId = selectedMatch.wantedSkills[0]?.id; 
      const targetOfferedSkillId = selectedMatch.offeredSkills[0]?.id; 

      // 3. UPDATED SWAP REQUEST ENDPOINT
      const response = await fetch(`${API_BASE_URL}/swaps/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({
          receiverId: selectedMatch.id,
          offeredSkillId: targetWantedSkillId, 
          wantedSkillId: targetOfferedSkillId,  
          message: swapMessage
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send request.");
      }

      setSuccessMessage(`Request sent to ${selectedMatch.name}!`);
      setTimeout(() => setSuccessMessage(""), 4000);
      setSelectedMatch(null);

    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsRequesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-blue-50">
        <Loader2 className="animate-spin size-10 text-blue-600 mb-4" />
        <p className="text-blue-900 font-medium">Calculating WRMR Matches...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-blue-600">
            <ArrowLeft className="size-6" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-blue-900 flex items-center gap-2">
              {/* dito lagayan ng icon pre kung trip natin, sa line na to mismo  */}
              <span className="truncate">KnoxHub</span>
            </h1>
            <p className="text-[10px] md:text-sm text-blue-600 truncate">Learn the hottest skills in the market</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 mt-2">
        
        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="size-5 text-green-600 shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {error ? (
          <Card className="max-w-xl mx-auto border-orange-200 bg-orange-50 shadow-md">
            <CardHeader className="flex flex-col items-center space-y-2 pb-4">
              <AlertCircle className="size-10 text-orange-500" />
              <CardTitle className="text-lg text-orange-800 text-center">Incomplete Profile</CardTitle>
              <CardDescription className="text-center text-orange-700 text-xs md:text-sm px-4">
                {error}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button onClick={() => navigate("/my-skills")} className="bg-orange-600 hover:bg-orange-700 text-white w-full md:w-auto">
                Add Skills Now
              </Button>
            </CardFooter>
          </Card>
        ) : matches.length === 0 ? (
          <div className="text-center py-20 px-6">
            <h2 className="text-xl font-bold text-blue-900">No matches found.</h2>
            <p className="text-blue-600 mt-2 text-sm">Try adding more skills to your "Wanted" or "Offered" lists!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {matches.map((match, index) => (
              <Card key={match.id} className="bg-white border-blue-100 shadow-sm relative flex flex-col hover:shadow-md transition-shadow">
                {index === 0 && (
                  <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                    BEST FIT
                  </div>
                )}

                <CardHeader className="pb-3 flex flex-row items-center gap-3">
                  <Avatar className="size-12 border border-blue-100">
                    <AvatarFallback className="bg-blue-50 text-blue-700 font-bold">
                      {match.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base text-blue-900 truncate">{match.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Star className="size-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium text-blue-800">{match.matchDetails.averageRating}</span>
                    </div>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                    {match.matchDetails.totalMatchScore}%
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4 flex-1 py-0">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">I'll Learn:</p>
                    <div className="flex flex-wrap gap-1">
                      {match.offeredSkills.map((skill: any) => (
                        <Badge key={skill.id} className="bg-blue-600 text-white text-[10px] px-1.5 py-0 capitalize border-none">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5 pb-4">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">I'll Teach:</p>
                    <div className="flex flex-wrap gap-1">
                      {match.wantedSkills.map((skill: any) => (
                        <Badge key={skill.id} variant="outline" className="text-blue-600 border-blue-200 text-[10px] px-1.5 py-0 capitalize">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-2">
                  <Button 
                    onClick={() => setSelectedMatch(match)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-9"
                  >
                    <UserPlus className="mr-2 size-3" /> Connect
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Swap Request Modal */}
        <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
          <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-blue-900">Request Swap</DialogTitle>
              <DialogDescription className="text-xs">
                Sending request to <span className="font-bold text-blue-600">{selectedMatch?.name}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3 py-2">
              <Label htmlFor="message" className="text-xs text-blue-900">Message</Label>
              <Input
                id="message"
                value={swapMessage}
                onChange={(e) => setSwapMessage(e.target.value)}
                className="text-sm h-12"
              />
            </div>

            <DialogFooter className="flex-row gap-2 mt-2">
              <Button variant="ghost" onClick={() => setSelectedMatch(null)} className="flex-1 text-xs">Cancel</Button>
              <Button 
                onClick={handleSubmitSwapRequest} 
                disabled={isRequesting}
                className="flex-[2] bg-blue-600 text-white text-xs"
              >
                {isRequesting ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}