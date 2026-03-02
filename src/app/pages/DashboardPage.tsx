import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Search, Users, BookOpen, Bell, User, MessageCircle, Calendar, Trophy, ShoppingBag, Shield, MessageSquare, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [swaps, setSwaps] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userString = localStorage.getItem("knoxite_user");
    if (userString) {
      setCurrentUserId(JSON.parse(userString).id);
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("knoxite_token");
      if (!token) {
        navigate("/");
        return;
      }

      const headers = { 
        "Authorization": `Bearer ${token}`,
        "bypass-tunnel-reminder": "true" 
      };

      const matchesRes = await fetch(`${API_BASE_URL}/matches`, { headers });
      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        setMatches(matchesData.slice(0, 3)); 
      }

      const swapsRes = await fetch(`${API_BASE_URL}/swaps`, { headers });
      if (swapsRes.ok) {
        const swapsData = await swapsRes.json();
        setSwaps(swapsData);
      }

    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const incomingRequests = swaps.filter(s => s.status === "PENDING" && s.receiverId === currentUserId);
  const activeSwaps = swaps.filter(s => s.status === "ACCEPTED");

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-blue-50">
        <Loader2 className="animate-spin size-10 text-blue-600 mb-4" />
        <p className="text-blue-900 font-medium text-center px-4">Syncing with Knoxite...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-blue-900 tracking-tight">Knoxite</h1>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/requests")} className="text-blue-600 relative">
              <Bell className="size-5 md:size-6" />
              {incomingRequests.length > 0 && (
                <span className="absolute top-1 right-1 size-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center border-2 border-white">
                  {incomingRequests.length}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/chat")} className="text-blue-600">
              <MessageCircle className="size-5 md:size-6" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="text-blue-600">
              <User className="size-5 md:size-6" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 pt-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Sidebar / Top Navigation for Mobile */}
          <aside className="col-span-12 md:col-span-3 space-y-4">
            <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-blue-400 font-bold tracking-wider">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="p-2 grid grid-cols-2 md:grid-cols-1 gap-1">
                {/* Always Visible Buttons */}
                <Button variant="ghost" className="justify-start text-blue-900 hover:bg-blue-50 text-xs md:text-sm" onClick={() => navigate("/marketplace")}>
                  <ShoppingBag className="mr-2 md:mr-3 size-4 md:size-5 text-blue-500 shrink-0" /> Marketplace
                </Button>
                <Button variant="ghost" className="justify-start text-blue-900 hover:bg-blue-50 text-xs md:text-sm" onClick={() => navigate("/my-skills")}>
                  <BookOpen className="mr-2 md:mr-3 size-4 md:size-5 text-blue-500 shrink-0" /> My Skills
                </Button>
                <Button variant="ghost" className="justify-start text-blue-900 hover:bg-blue-50 text-xs md:text-sm" onClick={() => navigate("/requests")}>
                  <Users className="mr-2 md:mr-3 size-4 md:size-5 text-blue-500 shrink-0" /> My Requests
                </Button>
                
                {/* These buttons are now VISIBLE ON MOBILE because they are in this grid */}
                <Button variant="ghost" className="justify-start text-blue-900 hover:bg-blue-50 text-xs md:text-sm" onClick={() => navigate("/community-forum")}>
                  <MessageSquare className="mr-2 md:mr-3 size-4 md:size-5 text-indigo-500 shrink-0" /> Forum
                </Button>
                <Button variant="ghost" className="justify-start text-blue-900 hover:bg-blue-50 text-xs md:text-sm" onClick={() => navigate("/leaderboard")}>
                  <Trophy className="mr-2 md:mr-3 size-4 md:size-5 text-yellow-500 shrink-0" /> Leaders
                </Button>
                <Button variant="ghost" className="justify-start text-blue-900 hover:bg-blue-50 text-xs md:text-sm" onClick={() => navigate("/calendar")}>
                  <Calendar className="mr-2 md:mr-3 size-4 md:size-5 text-blue-500 shrink-0" /> Calendar
                </Button>
              </CardContent>
            </Card>

            {/* Desktop-only Security Card */}
            <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm hidden md:block">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-blue-400 font-bold tracking-wider">System</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <Button variant="ghost" className="w-full justify-start text-blue-900 hover:bg-blue-50" onClick={() => navigate("/security")}>
                  <Shield className="mr-3 size-5 text-green-500" /> Security
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="col-span-12 md:col-span-9 space-y-6">
            <Card className="bg-white/90 border-blue-100 shadow-md overflow-hidden">
              <div className="h-2 bg-blue-600 w-full" />
              <CardHeader>
                <CardTitle className="text-blue-900">Top Algorithm Matches</CardTitle>
                <CardDescription>Based on your profile interests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {matches.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-blue-50 rounded-xl">
                    <p className="text-gray-400 italic px-4">No matches yet.</p>
                  </div>
                ) : (
                  matches.map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-3 rounded-xl border border-blue-50 bg-white hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Avatar className="size-10 border-2 border-blue-100 shrink-0">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${match.name}`} />
                          <AvatarFallback>{match.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-bold text-blue-900 truncate">{match.name}</h3>
                          <div className="flex gap-1 mt-1">
                            <Badge className="bg-blue-50 text-blue-700 border-none px-2 py-0 text-[10px]">
                              {match.offeredSkills[0]?.name || "Skill"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => navigate("/marketplace")} size="sm" className="bg-blue-600 hover:bg-blue-700 ml-2 h-8 text-xs">
                        Connect
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-blue-100 shadow-sm">
                <CardHeader><CardTitle className="text-xs font-bold text-blue-900 uppercase">Active Swaps</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {activeSwaps.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No active sessions.</p>
                  ) : (
                    activeSwaps.map((swap) => (
                      <div key={swap.id} className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                        <span className="text-xs font-medium text-blue-900 truncate mr-2">
                          With {swap.requesterId === currentUserId ? swap.receiver.name : swap.requester.name}
                        </span>
                        <Badge className="bg-green-500 text-white border-none shrink-0">Live</Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-blue-100 shadow-sm">
                <CardHeader><CardTitle className="text-xs font-bold text-blue-900 uppercase">Alerts</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {incomingRequests.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">Inbox empty.</p>
                  ) : (
                    incomingRequests.map((req) => (
                      <div key={req.id} className="p-3 rounded-lg bg-red-50 border border-red-100 flex justify-between items-center">
                        <p className="text-[10px] font-semibold text-red-900 truncate mr-2">{req.requester.name} requested!</p>
                        <Button size="sm" variant="link" className="text-red-600 text-[10px] h-auto p-0" onClick={() => navigate("/requests")}>View</Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}