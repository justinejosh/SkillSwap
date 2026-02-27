import { useState } from "react";
import { useNavigate } from "react-router";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Search, Star, Users, BookOpen, Bell, User, MessageCircle, Calendar, Trophy, ShoppingBag, Shield, AlertTriangle, Award, MessageSquare, Lightbulb, BarChart3, CheckCircle, Scale, Clock } from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data
  const matchSuggestions = [
    { id: 1, name: "Alice Johnson", offering: "Photoshop", wanting: "Piano", rating: 4.8, matches: 95 },
    { id: 2, name: "Bob Williams", offering: "Python", wanting: "Cooking", rating: 4.9, matches: 88 },
    { id: 3, name: "Carol Davis", offering: "Guitar", wanting: "Web Design", rating: 4.7, matches: 82 },
  ];

  const mySkills = [
    { id: 1, skill: "Web Development", level: "Expert" },
    { id: 2, skill: "Graphic Design", level: "Intermediate" },
  ];

  const myRequests = [
    { id: 1, skill: "Piano Lessons", status: "Pending" },
    { id: 2, skill: "Spanish", status: "Active" },
  ];

  const swapHistory = [
    { id: 1, with: "John Doe", skill: "Photography", date: "2 days ago" },
    { id: 2, with: "Jane Smith", skill: "Cooking", date: "1 week ago" },
  ];

  const notifications = [
    { id: 1, message: "Alice sent you a swap request", time: "5 min ago" },
    { id: 2, message: "Your Python lesson is tomorrow", time: "2 hours ago" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-blue-900">Knoxite</h1>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 size-5" />
              <Input
                type="search"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-blue-200 focus:border-blue-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/notifications")}
              className="text-blue-600 hover:text-blue-700 relative"
            >
              <Bell className="size-6" />
              <span className="absolute top-0 right-0 size-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                2
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/chat")}
              className="text-blue-600 hover:text-blue-700 relative"
            >
              <MessageCircle className="size-6" />
              <span className="absolute top-0 right-0 size-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="text-blue-600 hover:text-blue-700"
            >
              <User className="size-6" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3 space-y-2">
            <Card className="bg-white/90 backdrop-blur border-blue-100">
              <CardContent className="p-4 space-y-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/marketplace")}
                >
                  <ShoppingBag className="mr-2 size-5" />
                  Marketplace Feed
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/my-skills")}
                >
                  <BookOpen className="mr-2 size-5" />
                  My Skills
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                >
                  <Users className="mr-2 size-5" />
                  My Requests
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/reputation")}
                >
                  <Trophy className="mr-2 size-5" />
                  Reputation
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/calendar")}
                >
                  <Calendar className="mr-2 size-5" />
                  My Calendar
                </Button>
              </CardContent>
            </Card>
            
            <Card className="bg-white/90 backdrop-blur border-blue-100">
              <CardContent className="p-4 space-y-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/leaderboard")}
                >
                  <Trophy className="mr-2 size-5" />
                  Leaderboard
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/achievements")}
                >
                  <Award className="mr-2 size-5" />
                  Achievements
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/skill-requests")}
                >
                  <MessageSquare className="mr-2 size-5" />
                  Skill Requests
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/community")}
                >
                  <Lightbulb className="mr-2 size-5" />
                  Community
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/security")}
                >
                  <Shield className="mr-2 size-5" />
                  Security
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/report")}
                >
                  <AlertTriangle className="mr-2 size-5" />
                  Report User
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur border-blue-100">
              <CardContent className="p-4 space-y-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/notifications")}
                >
                  <Bell className="mr-2 size-5" />
                  Notifications
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-blue-900 hover:bg-blue-50"
                  onClick={() => navigate("/analytics")}
                >
                  <BarChart3 className="mr-2 size-5" />
                  My Analytics
                </Button>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="col-span-12 md:col-span-9 space-y-6">
            {/* Match Suggestions */}
            <Card className="bg-white/90 backdrop-blur border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-900">Match Suggestions</CardTitle>
                <CardDescription className="text-blue-600">
                  People who might be interested in skill swapping with you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {matchSuggestions.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${match.name}`} />
                        <AvatarFallback className="bg-blue-200 text-blue-900">
                          {match.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-blue-900">{match.name}</h3>
                        <p className="text-sm text-blue-600">
                          Offers: <Badge variant="secondary" className="bg-blue-100">{match.offering}</Badge>{" "}
                          Wants: <Badge variant="secondary" className="bg-green-100">{match.wanting}</Badge>
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="size-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-blue-600">{match.rating}</span>
                          <span className="text-sm text-blue-400">• {match.matches}% match</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Request Swap
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Swap History */}
              <Card className="bg-white/90 backdrop-blur border-blue-100">
                <CardHeader>
                  <CardTitle className="text-blue-900">Swap History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {swapHistory.map((swap) => (
                    <div key={swap.id} className="flex justify-between items-center p-3 rounded-lg bg-blue-50/50">
                      <div>
                        <p className="font-medium text-blue-900">{swap.with}</p>
                        <p className="text-sm text-blue-600">{swap.skill}</p>
                      </div>
                      <span className="text-xs text-blue-500">{swap.date}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="bg-white/90 backdrop-blur border-blue-100">
                <CardHeader>
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <Bell className="size-5" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notifications.map((notif) => (
                    <div key={notif.id} className="p-3 rounded-lg bg-blue-50/50">
                      <p className="text-sm text-blue-900">{notif.message}</p>
                      <span className="text-xs text-blue-500">{notif.time}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}