import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import { ArrowLeft, Award, Trophy, Star, Target, Zap, Users, BookOpen, MessageCircle } from "lucide-react";

export default function AchievementsPage() {
  const navigate = useNavigate();

  const achievements = [
    {
      id: 1,
      title: "First Swap Completed",
      description: "Complete your first skill swap",
      icon: Star,
      unlocked: true,
      progress: 100,
      date: "2 weeks ago",
      color: "bg-yellow-500",
    },
    {
      id: 2,
      title: "10 Sessions Mentor",
      description: "Complete 10 mentoring sessions",
      icon: BookOpen,
      unlocked: true,
      progress: 100,
      date: "1 week ago",
      color: "bg-blue-500",
    },
    {
      id: 3,
      title: "Top Rated Teacher",
      description: "Achieve a 4.5+ rating with at least 20 reviews",
      icon: Trophy,
      unlocked: true,
      progress: 100,
      date: "3 days ago",
      color: "bg-purple-500",
    },
    {
      id: 4,
      title: "Social Butterfly",
      description: "Connect with 50 different users",
      icon: Users,
      unlocked: true,
      progress: 100,
      date: "5 days ago",
      color: "bg-pink-500",
    },
    {
      id: 5,
      title: "Quick Responder",
      description: "Respond to 100 messages within 1 hour",
      icon: MessageCircle,
      unlocked: true,
      progress: 100,
      date: "1 week ago",
      color: "bg-green-500",
    },
    {
      id: 6,
      title: "50 Swaps Master",
      description: "Complete 50 skill swaps",
      icon: Target,
      unlocked: false,
      progress: 68,
      date: null,
      color: "bg-orange-500",
    },
    {
      id: 7,
      title: "100 Swaps Legend",
      description: "Complete 100 skill swaps",
      icon: Zap,
      unlocked: false,
      progress: 34,
      date: null,
      color: "bg-red-500",
    },
    {
      id: 8,
      title: "Perfect Rating",
      description: "Maintain a 5.0 rating for 50 reviews",
      icon: Award,
      unlocked: false,
      progress: 45,
      date: null,
      color: "bg-indigo-500",
    },
  ];

  const stats = {
    totalUnlocked: achievements.filter((a) => a.unlocked).length,
    totalAchievements: achievements.length,
    points: 2850,
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
            <Award className="size-6 text-yellow-600" />
            <h1 className="text-2xl font-bold text-blue-900">Achievements & Badges</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
            <CardContent className="p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Achievements</p>
                  <h3 className="text-3xl font-bold">{stats.totalUnlocked}/{stats.totalAchievements}</h3>
                </div>
                <Trophy className="size-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 border-0">
            <CardContent className="p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Achievement Points</p>
                  <h3 className="text-3xl font-bold">{stats.points}</h3>
                </div>
                <Star className="size-12 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
            <CardContent className="p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Completion Rate</p>
                  <h3 className="text-3xl font-bold">
                    {Math.round((stats.totalUnlocked / stats.totalAchievements) * 100)}%
                  </h3>
                </div>
                <Target className="size-12 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements Grid */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Your Achievements</CardTitle>
            <CardDescription className="text-blue-600">
              Unlock badges by completing challenges and milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.id}
                    className={`relative p-6 rounded-lg border transition-all ${
                      achievement.unlocked
                        ? "border-blue-200 bg-blue-50/50 hover:shadow-md"
                        : "border-gray-200 bg-gray-50/30 opacity-75"
                    }`}
                  >
                    {achievement.unlocked && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-100 text-green-800">Unlocked</Badge>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-4">
                      <div
                        className={`${achievement.color} ${
                          achievement.unlocked ? "" : "opacity-30"
                        } p-3 rounded-lg`}
                      >
                        <Icon className="size-8 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className={`font-medium mb-1 ${achievement.unlocked ? "text-blue-900" : "text-gray-600"}`}>
                          {achievement.title}
                        </h3>
                        <p className={`text-sm mb-3 ${achievement.unlocked ? "text-blue-600" : "text-gray-500"}`}>
                          {achievement.description}
                        </p>
                        
                        {achievement.unlocked ? (
                          <p className="text-xs text-green-600 font-medium">
                            Unlocked {achievement.date}
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Progress</span>
                              <span className="text-gray-700 font-medium">{achievement.progress}%</span>
                            </div>
                            <Progress value={achievement.progress} className="h-2" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
