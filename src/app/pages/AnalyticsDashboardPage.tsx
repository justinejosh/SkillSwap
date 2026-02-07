import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, TrendingUp, Clock, Users, Award, Target, Calendar, Brain, BarChart3, Activity } from "lucide-react";

export default function AnalyticsDashboardPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("month");

  // Mock analytics data
  const stats = {
    totalSwaps: 23,
    hoursLearned: 47,
    hoursTeaching: 52,
    activeSkills: 5,
    reputation: 4.8,
    growth: "+15%",
  };

  const skillProgress = [
    { skill: "Python Programming", hoursSpent: 12, level: "Intermediate", progress: 65, trend: "up" },
    { skill: "Guitar Lessons", hoursSpent: 8, level: "Beginner", progress: 40, trend: "up" },
    { skill: "Spanish", hoursSpent: 15, level: "Advanced", progress: 80, trend: "stable" },
    { skill: "Photography", hoursSpent: 6, level: "Beginner", progress: 30, trend: "up" },
  ];

  const teachingStats = [
    { skill: "Web Development", students: 8, hours: 24, rating: 4.9 },
    { skill: "Graphic Design", students: 5, hours: 18, rating: 4.7 },
    { skill: "Video Editing", students: 3, hours: 10, rating: 4.8 },
  ];

  const weeklyActivity = [
    { day: "Mon", learned: 3, taught: 2 },
    { day: "Tue", learned: 2, taught: 3 },
    { day: "Wed", learned: 4, taught: 2 },
    { day: "Thu", learned: 1, taught: 4 },
    { day: "Fri", learned: 3, taught: 3 },
    { day: "Sat", learned: 5, taught: 1 },
    { day: "Sun", learned: 2, taught: 2 },
  ];

  const achievements = [
    { name: "Quick Learner", date: "Jan 20, 2026", description: "Completed 5 swaps in one week" },
    { name: "Master Teacher", date: "Jan 15, 2026", description: "Taught 10+ students" },
    { name: "Community Champion", date: "Jan 10, 2026", description: "Maintained 4.8+ rating" },
  ];

  const goalProgress = [
    { goal: "Complete 30 swaps", current: 23, target: 30, percentage: 77 },
    { goal: "Learn 3 new skills", current: 2, target: 3, percentage: 67 },
    { goal: "Teach 50 hours", current: 52, target: 50, percentage: 100 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="size-6" />
            </Button>
            <div className="flex items-center gap-3">
              <BarChart3 className="size-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">My Analytics</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === "week" ? "default" : "outline"}
              onClick={() => setTimeRange("week")}
              className={timeRange === "week" ? "bg-blue-600" : "border-blue-200 text-blue-600"}
            >
              Week
            </Button>
            <Button
              variant={timeRange === "month" ? "default" : "outline"}
              onClick={() => setTimeRange("month")}
              className={timeRange === "month" ? "bg-blue-600" : "border-blue-200 text-blue-600"}
            >
              Month
            </Button>
            <Button
              variant={timeRange === "year" ? "default" : "outline"}
              onClick={() => setTimeRange("year")}
              className={timeRange === "year" ? "bg-blue-600" : "border-blue-200 text-blue-600"}
            >
              Year
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Swaps</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">{stats.totalSwaps}</h3>
                  <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="size-4" />
                    {stats.growth} this month
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="size-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Hours Learning</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">{stats.hoursLearned}</h3>
                  <p className="text-sm text-blue-400 mt-1">Across {stats.activeSkills} skills</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Brain className="size-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Hours Teaching</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">{stats.hoursTeaching}</h3>
                  <p className="text-sm text-blue-400 mt-1">Rating: {stats.reputation} ⭐</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Award className="size-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics Tabs */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Detailed Analytics</CardTitle>
            <CardDescription className="text-blue-600">
              Track your learning journey and teaching impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="learning" className="space-y-6">
              <TabsList className="grid grid-cols-4 w-full bg-blue-50">
                <TabsTrigger value="learning" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Learning Progress
                </TabsTrigger>
                <TabsTrigger value="teaching" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Teaching Stats
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Weekly Activity
                </TabsTrigger>
                <TabsTrigger value="goals" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Goals
                </TabsTrigger>
              </TabsList>

              {/* Learning Progress */}
              <TabsContent value="learning" className="space-y-4">
                {skillProgress.map((skill, index) => (
                  <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-blue-900">{skill.skill}</h4>
                        <p className="text-sm text-blue-600">{skill.hoursSpent} hours spent</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-900 border-blue-200">
                        {skill.level}
                      </Badge>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${skill.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-blue-600">{skill.progress}% complete</span>
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        {skill.trend === "up" ? <TrendingUp className="size-3" /> : null}
                        Trending {skill.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* Teaching Stats */}
              <TabsContent value="teaching" className="space-y-4">
                {teachingStats.map((stat, index) => (
                  <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900">{stat.skill}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-blue-600">
                            👥 {stat.students} students
                          </span>
                          <span className="text-sm text-blue-600">
                            ⏱️ {stat.hours} hours
                          </span>
                          <span className="text-sm text-yellow-600">
                            ⭐ {stat.rating} rating
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/reputation")}
                        className="border-blue-200 text-blue-600"
                      >
                        View Feedback
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>

              {/* Weekly Activity */}
              <TabsContent value="activity" className="space-y-4">
                <div className="grid grid-cols-7 gap-2">
                  {weeklyActivity.map((day, index) => (
                    <div key={index} className="text-center">
                      <p className="text-xs text-blue-600 mb-2">{day.day}</p>
                      <div className="space-y-2">
                        <div className="bg-blue-100 rounded p-2">
                          <p className="text-xs text-blue-600">Learned</p>
                          <p className="text-lg font-bold text-blue-900">{day.learned}h</p>
                        </div>
                        <div className="bg-green-100 rounded p-2">
                          <p className="text-xs text-green-600">Taught</p>
                          <p className="text-lg font-bold text-green-900">{day.taught}h</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-semibold text-blue-900 mb-2">Activity Insights</h4>
                  <ul className="space-y-2 text-sm text-blue-600">
                    <li>• Most active day: Saturday (6 hours total)</li>
                    <li>• Average daily activity: 4.3 hours</li>
                    <li>• Balance: Teaching slightly more than learning (+3 hours)</li>
                  </ul>
                </div>
              </TabsContent>

              {/* Goals */}
              <TabsContent value="goals" className="space-y-4">
                {goalProgress.map((goal, index) => (
                  <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-blue-900">{goal.goal}</h4>
                        <p className="text-sm text-blue-600">
                          {goal.current} / {goal.target}
                        </p>
                      </div>
                      {goal.percentage >= 100 && (
                        <Badge className="bg-green-500 text-white">
                          Completed! 🎉
                        </Badge>
                      )}
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2 mt-3">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          goal.percentage >= 100 ? "bg-green-500" : "bg-purple-600"
                        }`}
                        style={{ width: `${Math.min(goal.percentage, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-purple-600 mt-2">{goal.percentage}% complete</p>
                  </div>
                ))}
                
                <Button
                  onClick={() => navigate("/achievements")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                >
                  <Target className="mr-2 size-4" />
                  View All Achievements
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Recent Achievements */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Recent Achievements</CardTitle>
            <CardDescription className="text-blue-600">
              Your latest milestones and accomplishments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="p-2 bg-yellow-200 rounded-full">
                  <Award className="size-5 text-yellow-700" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900">{achievement.name}</h4>
                  <p className="text-sm text-blue-600">{achievement.description}</p>
                  <p className="text-xs text-blue-400 mt-1">{achievement.date}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
