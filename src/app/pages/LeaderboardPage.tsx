import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, Trophy, Star, ArrowLeftRight, TrendingUp, Loader2 } from "lucide-react";

// 1. IMPORT YOUR CONFIG
import { API_BASE_URL } from "@/config";

export default function LeaderboardPage() {
  const navigate = useNavigate();
  
  // 1. New Dynamic States
  // Mentors tab
  const [mentors, setMentors] = useState<any[]>([]);
  const [myStats, setMyStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  //Swaps tab
  const [swappers, setSwappers] = useState<any[]>([]);

  //Rated tab boi
  const [ratedMentors, setRatedMentors] = useState<any[]>([]);

  //get the rank of the user for the corresponding tab
  const [activeTab, setActiveTab] = useState("mentors");

  // 2. The Fetch Logic
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const token = localStorage.getItem("knoxite_token");
        if (!token) {
          navigate("/");
          return;
        }

        const response = await fetch(`${API_BASE_URL}/leaderboard`, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "bypass-tunnel-reminder": "true"
          }
        });

        if (response.ok) {
          const data = await response.json();
          setMentors(data.topMentors || []);
          setMyStats(data.currentUserStats || null);
        }

        // 2. Fetch Top Swappers for the Swaps Tab
        const swapRes = await fetch(`${API_BASE_URL}/leaderboard/swaps`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "bypass-tunnel-reminder": "true" // Good to keep this consistent
          }
        });

      if (swapRes.ok) {
        const swapData = await swapRes.json();
        setSwappers(swapData); // Make sure you defined [swappers, setSwappers] at the top!
      }


      } catch (error) {
        console.error("Leaderboard fetch failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, [navigate]);

  const getRankBadge = (rank: number) => {
  if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-none";
  if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white border-none";
  if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600 text-white border-none";
  return "bg-blue-500 text-white border-none"; // Modern solid blue for others
  };

  const getRankIcon = (rank: number) => {
  return (
    <div className={`flex items-center justify-center size-9 md:size-11 rounded-full font-bold shadow-sm ${getRankBadge(rank)}`}>
      {rank}
    </div>
  );
  };
  // 3. The Loading Screen
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-blue-50">
        <Loader2 className="animate-spin size-10 text-blue-600 mb-2" />
        <p className="text-blue-900 font-medium">Syncing Rankings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 pb-28">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">


          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="size-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Trophy className="size-6 text-yellow-600" />
            <h1 className="text-xl md:text-2xl font-bold text-blue-900">Leaderboard</h1>
          </div>
        </div>
      </header>

      {/* 

      Nandito yung pangpalit ng names ng options sa leaderboards, nasa baba

      */}
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <Tabs defaultValue="mentors" onValueChange={(value) => setActiveTab(value)}className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-blue-100 h-auto p-1">
            <TabsTrigger value="mentors" className="py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm">
              <Star className="mr-1 md:mr-2 size-4" /> Top Mentors  {/*MENTORS to, nasa baba yung iba*/}
            </TabsTrigger>
            <TabsTrigger value="swaps" className="py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm">
              <ArrowLeftRight className="mr-1 md:mr-2 size-4" /> Most Swaps
            </TabsTrigger>
            <TabsTrigger value="rated" className="py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm">
              <TrendingUp className="mr-1 md:mr-2 size-4" /> Highest Rated
            </TabsTrigger>
          </TabsList>

          {/* Top Mentors Tab */}
          <TabsContent value="mentors" className="space-y-4 outline-none">
            <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-blue-900 text-lg md:text-xl">Top Mentors</CardTitle>
                <CardDescription className="text-blue-600 text-xs md:text-sm">
                  Based on total reviews and teaching activity
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 md:p-6 pt-0 md:pt-0 space-y-2">
                {/* 4. MAPPING THE REAL DATA HERE */}
                {mentors.length === 0 ? (
                  <div className="text-center py-10 text-blue-400 italic">No rankings available yet.</div>
                ) : (
                  mentors.map((mentor) => (
                    <div
                      key={mentor.id}
                      className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all ${
                        mentor.rank <= 3 ? "border-yellow-100 bg-yellow-50/40" : "border-blue-50 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                        <div className="flex items-center justify-center w-8 md:w-12 shrink-0">
                          {getRankIcon(mentor.rank)}
                        </div>
                        <Avatar className="size-10 md:size-12 shrink-0 border border-blue-100">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${mentor.name}`} />
                          <AvatarFallback className="bg-blue-200 text-blue-900">{mentor.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-bold text-blue-900 text-sm md:text-base truncate">{mentor.name}</h3>
                          <p className="text-[10px] md:text-sm text-blue-600 truncate">{mentor.skills}</p>
                          <div className="flex items-center gap-1 md:gap-2 mt-0.5">
                            <Star className="size-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-[10px] md:text-sm font-bold text-blue-700">{mentor.rating}</span>
                            <span className="text-[10px] md:text-blue-400">• {mentor.reviews} reviews</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <Badge className="bg-blue-100 text-blue-700 border-none px-2 md:px-3 py-1 font-bold text-[10px] md:text-sm">
                          {mentor.points || 0} Points
                        </Badge>
                        <span className="text-[9px] md:text-[10px] text-blue-400 font-medium uppercase tracking-tighter">
                          TOTAL POINTS
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
          

          {/* 2. SWAPS TAB  */}
            
          <TabsContent value="swaps" className="space-y-4 outline-none">
            <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-blue-900 text-lg md:text-xl">Most Active Swappers</CardTitle>
                <CardDescription className="text-blue-600 text-xs md:text-sm">
                  Users with the highest number of successful skill exchanges
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 md:p-6 pt-0 md:pt-0 space-y-2">
                {swappers.length === 0 ? (
                  <div className="text-center py-10 text-blue-400 italic">No swap activity recorded yet.</div>
                ) : (
                  swappers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-blue-50 bg-white transition-all hover:border-blue-200"
                    >
                      <div className="flex items-center gap-4">
                        {/* Use the same rank icon logic we just polished */}
                        <div className="flex items-center justify-center w-10 md:w-12 shrink-0">
                          {getRankIcon(user.rank)}
                        </div>
                        
                        <div className="min-w-0">
                          <h3 className="font-bold text-blue-900 text-sm md:text-base truncate">{user.name}</h3>
                          <p className="text-[10px] md:text-sm text-blue-600 truncate">{user.skill}</p>
                        </div>
                      </div>

                      {/* Unique badge for this tab showing the swap count */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className="bg-blue-100 text-blue-700 border-none px-3">
                          {user.totalSwaps} Swaps
                        </Badge>
                        <span className="text-[10px] text-blue-400 font-medium">Activity Score</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rated" className="space-y-4 outline-none">
            <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm">
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="text-blue-900 text-lg md:text-xl">Highest Rated</CardTitle>
                <CardDescription className="text-blue-600 text-xs md:text-sm">
                  The community's most trusted mentors based on feedback quality
                <CardDescription className="text-blue-600 text-xs md:text-sm">
                  Note: Users must be rated at least 20 times in order to appear here (pwede pa to baguhin erp)
                </CardDescription>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-2 md:p-6 pt-0 md:pt-0 space-y-2">
                {ratedMentors.length === 0 ? (
                  <div className="text-center py-10 text-blue-400 italic">No ratings found yet.</div>
                ) : (
                  ratedMentors.map((user) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-3 md:p-4 rounded-xl border border-blue-50 bg-white transition-all hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        {/* Using our polished gradient medals */}
                        <div className="flex items-center justify-center w-10 md:w-12 shrink-0">
                          {getRankIcon(user.rank)}
                        </div>
                        
                        <div className="min-w-0">
                          <h3 className="font-bold text-blue-900 text-sm md:text-base truncate">{user.name}</h3>
                          <p className="text-[10px] md:text-sm text-blue-600 truncate">{user.skill}</p>
                        </div>
                      </div>

                      {/* Quality Score Section */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                          <Star className="size-3 md:size-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-xs md:text-sm font-bold text-yellow-700">
                            {Number(user.rating).toFixed(1)}
                          </span>
                        </div>
                        <span className="text-[10px] text-blue-400 font-medium">
                          {user.reviews} reviews
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>
      
      {/* --- UPDATED: Dynamic Floating Standing Bar --- */}
      {myStats && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-blue-100 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-30">
          <div className="max-w-6xl mx-auto flex items-center justify-between bg-blue-700 p-3 md:p-4 rounded-2xl text-white shadow-lg border border-blue-400">
            <div className="flex items-center gap-3 overflow-hidden">
              
              {/* DYNAMIC RANK DISPLAY */}
              <div className="bg-white/20 px-3 py-1 rounded-lg font-bold text-sm md:text-lg shrink-0">
                {(() => {
                  // 1. Pick the list based on the active tab
                  let currentList = [];
                  if (activeTab === "mentors") currentList = mentors;
                  if (activeTab === "swaps") currentList = swappers;
                  if (activeTab === "rated") currentList = ratedMentors;

                  // 2. Find where YOU are in that list
                  const yourIndex = currentList.findIndex(u => u.id === myStats.id);
                  
                  // 3. If found, show rank (index + 1), otherwise show ??
                  return yourIndex !== -1 ? `#${yourIndex + 1}` : "??";
                })()}
              </div>

              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold opacity-70 tracking-wider text-blue-100">
                  Your Standing ({activeTab})
                </p>
                <p className="font-bold text-sm md:text-base truncate">{myStats.name} (You)</p>
              </div>
            </div>
            
            {/* STATUS BADGE */}
            <Badge className="bg-blue-500/50 border-none text-white font-medium px-3 py-1 shrink-0">
              {(() => {
                // 1. Find the current user's data object in the active list
                let currentList = [];
                if (activeTab === "mentors") currentList = mentors;
                if (activeTab === "swaps") currentList = swappers;
                if (activeTab === "rated") currentList = ratedMentors;

                const myData = currentList.find(u => u.id === myStats.id);

                // 2. If we aren't in the list, show a default message
                if (!myData) return "Unranked";

                // 3. Return the specific score based on the tab
                if (activeTab === "mentors") {
                  // Assuming mentors uses a 'points' or 'score' field
                  return `${myData.points || 0} Points`;
                }
                
                if (activeTab === "swaps") {
                  return `${myData.totalSwaps || 0} Swaps`;
                }
                
                if (activeTab === "rated") {
                  return (
                    <div className="flex items-center gap-1">
                      <Star className="size-3 fill-white text-white" />
                      {Number(myData.rating || 0).toFixed(1)}
                    </div>
                  );
                }

                return "Top Performer";
              })()}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}