import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, Trophy, Star, ArrowLeftRight, TrendingUp, Medal, Crown, Loader2 } from "lucide-react";

// 1. IMPORT YOUR CONFIG
import { API_BASE_URL } from "@/config";

export default function LeaderboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Note: These are currently mock data. 
  // To make them live, you would use a useEffect hook with fetch(`${API_BASE_URL}/leaderboard`)
  const topMentors = [
    { id: 1, name: "Sarah Johnson", skills: "Web Dev, Python", rating: 4.9, reviews: 156, rank: 1 },
    { id: 2, name: "Michael Chen", skills: "Guitar, Music Theory", rating: 4.9, reviews: 142, rank: 2 },
    { id: 3, name: "Emma Rodriguez", skills: "Graphic Design", rating: 4.8, reviews: 138, rank: 3 },
    { id: 4, name: "David Kim", skills: "Photography", rating: 4.8, reviews: 125, rank: 4 },
    { id: 5, name: "Lisa Anderson", skills: "Spanish, French", rating: 4.7, reviews: 118, rank: 5 },
  ];

  const mostSwaps = [
    { id: 1, name: "Alex Thompson", swaps: 89, rating: 4.8, rank: 1 },
    { id: 2, name: "Jessica Lee", swaps: 82, rating: 4.7, rank: 2 },
    { id: 3, name: "Chris Martinez", swaps: 76, rating: 4.9, rank: 3 },
    { id: 4, name: "Rachel Green", swaps: 71, rating: 4.6, rank: 4 },
  ];

  const highestRated = [
    { id: 1, name: "Dr. Emily Watson", rating: 5.0, reviews: 45, skills: "Mathematics", rank: 1 },
    { id: 2, name: "Prof. Robert Chen", rating: 4.95, reviews: 62, skills: "Physics", rank: 2 },
    { id: 3, name: "Michael Chen", rating: 4.92, reviews: 142, skills: "Guitar", rank: 3 },
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="size-5 md:size-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="size-5 md:size-6 text-gray-400" />;
    if (rank === 3) return <Medal className="size-5 md:size-6 text-orange-600" />;
    return <span className="text-sm md:text-lg font-bold text-blue-600">#{rank}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-none";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white border-none";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600 text-white border-none";
    return "bg-blue-100 text-blue-800 border-none";
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-blue-50">
        <Loader2 className="animate-spin size-10 text-blue-600 mb-2" />
        <p className="text-blue-900 font-medium">Loading Rankings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 pb-10">
      {/* Header */}
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

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        <Tabs defaultValue="mentors" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-blue-100 h-auto p-1">
            <TabsTrigger value="mentors" className="py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm">
              <Star className="mr-1 md:mr-2 size-4" />
              Mentors
            </TabsTrigger>
            <TabsTrigger value="swaps" className="py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm">
              <ArrowLeftRight className="mr-1 md:mr-2 size-4" />
              Swaps
            </TabsTrigger>
            <TabsTrigger value="rated" className="py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm">
              <TrendingUp className="mr-1 md:mr-2 size-4" />
              Rated
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
                {topMentors.map((mentor) => (
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
                    <Badge className={`${getRankBadge(mentor.rank)} text-[10px] px-2 py-0 h-5 shrink-0 ml-2`}>
                      #{mentor.rank}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Most Swaps Tab */}
          <TabsContent value="swaps" className="space-y-4 outline-none">
            <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-blue-900 text-lg">Swap Masters</CardTitle>
                <CardDescription className="text-blue-600 text-xs">Users with most completed sessions</CardDescription>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {mostSwaps.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-blue-50 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex justify-center">{getRankIcon(user.rank)}</div>
                      <Avatar className="size-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-blue-900 text-sm">{user.name}</h3>
                        <div className="flex items-center gap-1 text-[10px] text-blue-600">
                          <ArrowLeftRight className="size-3" />
                          <span>{user.swaps} swaps completed</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getRankBadge(user.rank)} text-[10px]`}>#{user.rank}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Highest Rated Tab */}
          <TabsContent value="rated" className="space-y-4 outline-none">
            <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm">
              <CardHeader className="p-4">
                <CardTitle className="text-blue-900 text-lg">Highest Rated</CardTitle>
                <CardDescription className="text-blue-600 text-xs">Top quality mentors by average star rating</CardDescription>
              </CardHeader>
              <CardContent className="p-2 space-y-2">
                {highestRated.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-blue-50 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex justify-center">{getRankIcon(user.rank)}</div>
                      <Avatar className="size-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-blue-900 text-sm">{user.name}</h3>
                        <div className="flex items-center gap-1">
                           <Star className="size-3 fill-yellow-400 text-yellow-400" />
                           <span className="text-[10px] font-bold text-blue-700">{user.rating}</span>
                           <span className="text-[10px] text-blue-400">({user.reviews} reviews)</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getRankBadge(user.rank)} text-[10px]`}>#{user.rank}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}