import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, Trophy, Star, ArrowLeftRight, TrendingUp, Medal, Crown } from "lucide-react";

export default function LeaderboardPage() {
  const navigate = useNavigate();

  const topMentors = [
    { id: 1, name: "Sarah Johnson", skills: "Web Dev, Python", rating: 4.9, reviews: 156, rank: 1 },
    { id: 2, name: "Michael Chen", skills: "Guitar, Music Theory", rating: 4.9, reviews: 142, rank: 2 },
    { id: 3, name: "Emma Rodriguez", skills: "Graphic Design", rating: 4.8, reviews: 138, rank: 3 },
    { id: 4, name: "David Kim", skills: "Photography", rating: 4.8, reviews: 125, rank: 4 },
    { id: 5, name: "Lisa Anderson", skills: "Spanish, French", rating: 4.7, reviews: 118, rank: 5 },
    { id: 6, name: "James Wilson", skills: "Cooking", rating: 4.7, reviews: 112, rank: 6 },
    { id: 7, name: "Maria Garcia", skills: "Yoga, Fitness", rating: 4.7, reviews: 108, rank: 7 },
    { id: 8, name: "Tom Brown", skills: "Piano", rating: 4.6, reviews: 95, rank: 8 },
  ];

  const mostSwaps = [
    { id: 1, name: "Alex Thompson", swaps: 89, rating: 4.8, rank: 1 },
    { id: 2, name: "Jessica Lee", swaps: 82, rating: 4.7, rank: 2 },
    { id: 3, name: "Chris Martinez", swaps: 76, rating: 4.9, rank: 3 },
    { id: 4, name: "Rachel Green", swaps: 71, rating: 4.6, rank: 4 },
    { id: 5, name: "Daniel Park", swaps: 68, rating: 4.8, rank: 5 },
    { id: 6, name: "Sophia Taylor", swaps: 64, rating: 4.7, rank: 6 },
    { id: 7, name: "Ryan Miller", swaps: 59, rating: 4.5, rank: 7 },
    { id: 8, name: "Olivia Davis", swaps: 55, rating: 4.8, rank: 8 },
  ];

  const highestRated = [
    { id: 1, name: "Dr. Emily Watson", rating: 5.0, reviews: 45, skills: "Mathematics", rank: 1 },
    { id: 2, name: "Prof. Robert Chen", rating: 4.95, reviews: 62, skills: "Physics", rank: 2 },
    { id: 3, name: "Michael Chen", rating: 4.92, reviews: 142, skills: "Guitar", rank: 3 },
    { id: 4, name: "Sarah Johnson", rating: 4.91, reviews: 156, skills: "Web Dev", rank: 4 },
    { id: 5, name: "Isabella Martinez", rating: 4.89, reviews: 89, skills: "Art", rank: 5 },
    { id: 6, name: "Chris Martinez", rating: 4.88, reviews: 124, skills: "Marketing", rank: 6 },
    { id: 7, name: "Emma Rodriguez", rating: 4.87, reviews: 138, skills: "Design", rank: 7 },
    { id: 8, name: "David Kim", rating: 4.86, reviews: 125, skills: "Photography", rank: 8 },
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="size-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="size-6 text-gray-400" />;
    if (rank === 3) return <Medal className="size-6 text-orange-600" />;
    return <span className="text-lg font-bold text-blue-600">#{rank}</span>;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
    return "bg-blue-100 text-blue-800";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
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
            <h1 className="text-2xl font-bold text-blue-900">Leaderboard</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        <Tabs defaultValue="mentors" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-blue-100">
            <TabsTrigger value="mentors" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Star className="mr-2 size-4" />
              Top Mentors
            </TabsTrigger>
            <TabsTrigger value="swaps" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <ArrowLeftRight className="mr-2 size-4" />
              Most Swaps
            </TabsTrigger>
            <TabsTrigger value="rated" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <TrendingUp className="mr-2 size-4" />
              Highest Rated
            </TabsTrigger>
          </TabsList>

          {/* Top Mentors */}
          <TabsContent value="mentors" className="space-y-4">
            <Card className="bg-white/90 backdrop-blur border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-900">Top Mentors by Reviews</CardTitle>
                <CardDescription className="text-blue-600">
                  Most reviewed and highly rated mentors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topMentors.map((mentor) => (
                  <div
                    key={mentor.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      mentor.rank <= 3 ? "border-yellow-200 bg-yellow-50/30" : "border-blue-100 bg-blue-50/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12">
                        {getRankIcon(mentor.rank)}
                      </div>
                      <Avatar className="size-12">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${mentor.name}`} />
                        <AvatarFallback className="bg-blue-200 text-blue-900">
                          {mentor.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-blue-900">{mentor.name}</h3>
                        <p className="text-sm text-blue-600">{mentor.skills}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="size-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-blue-600">{mentor.rating}</span>
                          <span className="text-sm text-blue-400">• {mentor.reviews} reviews</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={getRankBadge(mentor.rank)}>
                      Rank #{mentor.rank}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Most Swaps */}
          <TabsContent value="swaps" className="space-y-4">
            <Card className="bg-white/90 backdrop-blur border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-900">Most Swaps Completed</CardTitle>
                <CardDescription className="text-blue-600">
                  Users who have completed the most skill swaps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mostSwaps.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      user.rank <= 3 ? "border-yellow-200 bg-yellow-50/30" : "border-blue-100 bg-blue-50/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12">
                        {getRankIcon(user.rank)}
                      </div>
                      <Avatar className="size-12">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                        <AvatarFallback className="bg-blue-200 text-blue-900">
                          {user.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-blue-900">{user.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <ArrowLeftRight className="size-4 text-blue-600" />
                          <span className="text-sm text-blue-600">{user.swaps} swaps completed</span>
                          <span className="text-sm text-blue-400">• {user.rating} ★</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={getRankBadge(user.rank)}>
                      Rank #{user.rank}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Highest Rated */}
          <TabsContent value="rated" className="space-y-4">
            <Card className="bg-white/90 backdrop-blur border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-900">Highest Rated Users</CardTitle>
                <CardDescription className="text-blue-600">
                  Users with the highest average ratings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {highestRated.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      user.rank <= 3 ? "border-yellow-200 bg-yellow-50/30" : "border-blue-100 bg-blue-50/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12">
                        {getRankIcon(user.rank)}
                      </div>
                      <Avatar className="size-12">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                        <AvatarFallback className="bg-blue-200 text-blue-900">
                          {user.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-blue-900">{user.name}</h3>
                        <p className="text-sm text-blue-600">{user.skills}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="size-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-blue-600 font-medium">{user.rating}</span>
                          <span className="text-sm text-blue-400">• {user.reviews} reviews</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className={getRankBadge(user.rank)}>
                      Rank #{user.rank}
                    </Badge>
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
