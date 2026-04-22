import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, Star, ArrowLeftRight, TrendingUp, Loader2, CheckCircle2, Award } from "lucide-react";

import { API_BASE_URL } from "@/config";

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [mentors, setMentors] = useState<any[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [swappers, setSwappers] = useState<any[]>([]);
  const [ratedMentors, setRatedMentors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("mentors");

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const token = localStorage.getItem("knoxite_token");
        if (!token) { navigate("/"); return; }

        const [leaderboardRes, swapsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/leaderboard`, { headers: { "Authorization": `Bearer ${token}`, "bypass-tunnel-reminder": "true" } }),
          fetch(`${API_BASE_URL}/leaderboard/swaps`, { headers: { "Authorization": `Bearer ${token}`, "bypass-tunnel-reminder": "true" } })
        ]);

        if (leaderboardRes.ok) {
          const data = await leaderboardRes.json();
          setMentors(data.topMentors || []);
          setMyStats(data.currentUserStats || null);
          setRatedMentors([...data.topMentors].sort((a, b) => b.rating - a.rating));
        }

        if (swapsRes.ok) {
          setSwappers(await swapsRes.json());
        }
      } catch (error) {
        console.error("System synchronization error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRankings();
  }, [navigate]);

  const getRankStyles = (rank: number) => {
    if (rank === 1) return "bg-amber-100 text-amber-700 border-amber-200";
    if (rank === 2) return "bg-slate-100 text-slate-700 border-slate-200";
    if (rank === 3) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-blue-50 text-blue-700 border-blue-100";
  };

  const getRankIcon = (rank: number) => (
    <div className={`flex items-center justify-center size-10 rounded-lg font-bold border shadow-sm ${getRankStyles(rank)}`}>
      {rank}
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin size-10 text-blue-600 mb-4" />
        <p className="text-slate-600 font-semibold tracking-tight">Synchronizing Performance Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 font-sans">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")} className="rounded-full">
            <ArrowLeft className="size-5 text-slate-600" />
          </Button>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Academic Leaderboard</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <Tabs defaultValue="mentors" onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-slate-200 h-12 p-1 rounded-lg">
            <TabsTrigger value="mentors" className="rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-sm">
              <Award className="mr-2 size-4" /> Top Mentors
            </TabsTrigger>
            <TabsTrigger value="swaps" className="rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-sm">
              <ArrowLeftRight className="mr-2 size-4" /> Most Swaps
            </TabsTrigger>
            <TabsTrigger value="rated" className="rounded-md data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold text-sm">
              <TrendingUp className="mr-2 size-4" /> Quality Rating
            </TabsTrigger>
          </TabsList>

          {/* Top Mentors Tab */}
          <TabsContent value="mentors" className="space-y-4">
            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardHeader>
                <CardTitle className="text-slate-900 text-lg font-bold">Top Peer Mentors</CardTitle>
                <CardDescription>Performance based on total session contributions and peer-validated skills.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mentors.map((mentor, index) => (
                  <div key={mentor.id} className="flex items-center justify-between p-4 rounded-lg bg-white border border-slate-100 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      {getRankIcon(index + 1)}
                      <div className="relative">
                        <Avatar className="size-12 border-2 border-slate-50 ring-1 ring-slate-200">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${mentor.name}`} />
                          <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">{mentor.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-slate-100">
                          <CheckCircle2 className="size-4 text-blue-600 fill-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-base">{mentor.name}</h3>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{mentor.skills}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 border-blue-100">
                        {mentor.reviews || 0} COMPLETED REVIEW(S)
                      </Badge>
                      <div className="flex items-center gap-1.5">
                         <Star className="size-3.5 fill-amber-400 text-amber-400" />
                         <span className="text-sm font-bold text-slate-900">{mentor.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ... Swaps and Rated Tabs would follow the same professional structure ... */}
        </Tabs>
      </div>

      {/* Persistent User Performance Bar */}
      {myStats && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-30">
          <div className="max-w-5xl mx-auto flex items-center justify-between bg-slate-900 p-4 rounded-xl text-white">
             <div className="flex items-center gap-4">
                <div className="bg-blue-600 text-white size-10 rounded-lg flex items-center justify-center font-bold">
                   #{mentors.findIndex(u => u.id === myStats.id) + 1 || '?'}
                </div>
                <div>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Current Academic Standing</p>
                   <p className="font-bold text-base">{myStats.name} (Authorized User)</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Performance Status</p>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-bold">
                   Verified
                </Badge>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}