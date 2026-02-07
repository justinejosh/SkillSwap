import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ArrowLeft, Award, Star, Trophy, Target, Zap, Shield } from "lucide-react";

export default function ReputationPage() {
  const navigate = useNavigate();

  const badges = [
    {
      icon: <Award className="size-8 text-yellow-500" />,
      name: "Top Teacher",
      description: "Completed 10+ successful skill swaps",
      earned: true,
      progress: 100,
    },
    {
      icon: <Star className="size-8 text-blue-500" />,
      name: "Skill Master",
      description: "Expert level in 3+ skills",
      earned: true,
      progress: 100,
    },
    {
      icon: <Trophy className="size-8 text-purple-500" />,
      name: "Trusted Mentor",
      description: "Maintained 4.5+ star rating",
      earned: true,
      progress: 100,
    },
    {
      icon: <Target className="size-8 text-green-500" />,
      name: "Fast Learner",
      description: "Complete 5 learning sessions",
      earned: false,
      progress: 60,
    },
    {
      icon: <Zap className="size-8 text-orange-500" />,
      name: "Quick Responder",
      description: "Respond within 1 hour 20 times",
      earned: false,
      progress: 40,
    },
    {
      icon: <Shield className="size-8 text-red-500" />,
      name: "Community Guardian",
      description: "Help resolve 5 disputes",
      earned: false,
      progress: 0,
    },
  ];

  const stats = {
    totalPoints: 2850,
    level: 8,
    nextLevelPoints: 3000,
    swapsCompleted: 12,
    rating: 4.8,
    skillsTaught: 15,
    skillsLearned: 8,
  };

  const recentReviews = [
    {
      from: "Alice Johnson",
      avatar: "AJ",
      rating: 5,
      comment: "Amazing Photoshop teacher! Very patient and knowledgeable.",
      date: "2 days ago",
    },
    {
      from: "Bob Williams",
      avatar: "BW",
      rating: 5,
      comment: "Great Python lessons. Explained complex concepts clearly.",
      date: "1 week ago",
    },
    {
      from: "Carol Davis",
      avatar: "CD",
      rating: 4,
      comment: "Good guitar lessons, would recommend!",
      date: "2 weeks ago",
    },
  ];

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
          <h1 className="text-2xl font-bold text-blue-900">Reputation & Achievements</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-900">{stats.totalPoints}</div>
                <p className="text-sm text-blue-600 mt-1">Total Points</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-900">Level {stats.level}</div>
                <Progress value={(stats.totalPoints / stats.nextLevelPoints) * 100} className="mt-2" />
                <p className="text-xs text-blue-600 mt-1">{stats.nextLevelPoints - stats.totalPoints} pts to next level</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star className="size-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-3xl font-bold text-blue-900">{stats.rating}</span>
                </div>
                <p className="text-sm text-blue-600 mt-1">Average Rating</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-900">{stats.swapsCompleted}</div>
                <p className="text-sm text-blue-600 mt-1">Swaps Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Badges */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Badges & Achievements</CardTitle>
            <CardDescription className="text-blue-600">
              Unlock badges by completing challenges and milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map((badge, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    badge.earned
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 bg-gray-50/50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={badge.earned ? "" : "grayscale"}>
                      {badge.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-blue-900 flex items-center gap-2">
                        {badge.name}
                        {badge.earned && (
                          <Badge className="bg-green-100 text-green-900">Earned</Badge>
                        )}
                      </h3>
                      <p className="text-sm text-blue-600 mt-1">{badge.description}</p>
                      {!badge.earned && (
                        <div className="mt-2">
                          <Progress value={badge.progress} className="h-2" />
                          <p className="text-xs text-blue-500 mt-1">{badge.progress}% complete</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Recent Reviews</CardTitle>
            <CardDescription className="text-blue-600">
              What others are saying about your skills
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentReviews.map((review, index) => (
              <div key={index} className="p-4 rounded-lg border border-blue-100 bg-blue-50/50">
                <div className="flex items-start gap-3">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${review.from}`} />
                    <AvatarFallback className="bg-blue-200 text-blue-900">
                      {review.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-blue-900">{review.from}</h3>
                      <span className="text-xs text-blue-500">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="size-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-blue-700 mt-2">{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activity Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Teaching Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Skills Taught</span>
                  <span className="font-medium text-blue-900">{stats.skillsTaught}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Sessions Completed</span>
                  <span className="font-medium text-blue-900">{stats.swapsCompleted}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Average Session Rating</span>
                  <span className="font-medium text-blue-900">{stats.rating} ⭐</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Learning Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Skills Learned</span>
                  <span className="font-medium text-blue-900">{stats.skillsLearned}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Learning Hours</span>
                  <span className="font-medium text-blue-900">{stats.swapsCompleted * 2}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-700">Completion Rate</span>
                  <span className="font-medium text-blue-900">95%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
