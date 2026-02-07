import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ArrowLeft, Clock, Users, MessageCircle, Star, Award, CheckCircle, Calendar, BookOpen, TrendingUp, Filter } from "lucide-react";

export default function ActivityTimelinePage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("all");

  // Mock timeline data
  const activities = [
    {
      id: 1,
      type: "swap-completed",
      title: "Completed swap with Alice Johnson",
      description: "Python Programming lesson - 2 hours",
      timestamp: "2 hours ago",
      date: "Jan 30, 2026",
      icon: CheckCircle,
      color: "green",
      details: { rating: 5, skill: "Python" },
    },
    {
      id: 2,
      type: "achievement",
      title: "Earned 'Quick Learner' Badge",
      description: "Completed 5 skill swaps in one week",
      timestamp: "5 hours ago",
      date: "Jan 30, 2026",
      icon: Award,
      color: "yellow",
    },
    {
      id: 3,
      type: "message",
      title: "New message from Bob Williams",
      description: "Interested in your graphic design skills",
      timestamp: "1 day ago",
      date: "Jan 29, 2026",
      icon: MessageCircle,
      color: "blue",
    },
    {
      id: 4,
      type: "rating",
      title: "Received 5-star rating",
      description: "Carol Davis rated your web development teaching",
      timestamp: "2 days ago",
      date: "Jan 28, 2026",
      icon: Star,
      color: "orange",
      details: { rating: 5, from: "Carol Davis" },
    },
    {
      id: 5,
      type: "swap-scheduled",
      title: "Scheduled swap with David Chen",
      description: "Photography session - Feb 2, 2026 at 3:00 PM",
      timestamp: "3 days ago",
      date: "Jan 27, 2026",
      icon: Calendar,
      color: "purple",
    },
    {
      id: 6,
      type: "skill-added",
      title: "Added new skill to profile",
      description: "Spanish Language - Intermediate level",
      timestamp: "5 days ago",
      date: "Jan 25, 2026",
      icon: BookOpen,
      color: "teal",
    },
    {
      id: 7,
      type: "swap-completed",
      title: "Completed swap with Emma Wilson",
      description: "Guitar lessons taught - 1.5 hours",
      timestamp: "1 week ago",
      date: "Jan 23, 2026",
      icon: CheckCircle,
      color: "green",
      details: { rating: 4.5, skill: "Guitar" },
    },
    {
      id: 8,
      type: "milestone",
      title: "Reached 10 completed swaps!",
      description: "You're building a strong learning network",
      timestamp: "1 week ago",
      date: "Jan 23, 2026",
      icon: TrendingUp,
      color: "pink",
    },
    {
      id: 9,
      type: "swap-request",
      title: "Accepted swap request from Frank Miller",
      description: "Cooking lessons exchange for web design",
      timestamp: "2 weeks ago",
      date: "Jan 16, 2026",
      icon: Users,
      color: "blue",
    },
    {
      id: 10,
      type: "joined",
      title: "Joined SkillSwap Community",
      description: "Welcome to the platform!",
      timestamp: "1 month ago",
      date: "Jan 1, 2026",
      icon: Users,
      color: "indigo",
    },
  ];

  const filterOptions = [
    { value: "all", label: "All Activity", icon: Clock },
    { value: "swap-completed", label: "Completed Swaps", icon: CheckCircle },
    { value: "achievement", label: "Achievements", icon: Award },
    { value: "rating", label: "Ratings", icon: Star },
    { value: "message", label: "Messages", icon: MessageCircle },
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: { bg: string; text: string; border: string } } = {
      green: { bg: "bg-green-100", text: "text-green-600", border: "border-green-200" },
      blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
      yellow: { bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-200" },
      orange: { bg: "bg-orange-100", text: "text-orange-600", border: "border-orange-200" },
      purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" },
      teal: { bg: "bg-teal-100", text: "text-teal-600", border: "border-teal-200" },
      pink: { bg: "bg-pink-100", text: "text-pink-600", border: "border-pink-200" },
      indigo: { bg: "bg-indigo-100", text: "text-indigo-600", border: "border-indigo-200" },
    };
    return colors[color] || colors.blue;
  };

  const filteredActivities = filterType === "all" 
    ? activities 
    : activities.filter(a => a.type === filterType);

  // Group activities by date
  const groupedActivities = filteredActivities.reduce((acc, activity) => {
    const date = activity.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(activity);
    return acc;
  }, {} as { [key: string]: typeof activities });

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
              <Clock className="size-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">Activity Timeline</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Filter Bar */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="size-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900 mr-2">Filter:</span>
              {filterOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={filterType === option.value ? "default" : "outline"}
                    onClick={() => setFilterType(option.value)}
                    className={
                      filterType === option.value
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-blue-200 text-blue-600 hover:bg-blue-50"
                    }
                  >
                    <Icon className="mr-1 size-4" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-900">{activities.filter(a => a.type === "swap-completed").length}</div>
              <p className="text-sm text-blue-600 mt-1">Swaps Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-900">{activities.filter(a => a.type === "achievement").length}</div>
              <p className="text-sm text-blue-600 mt-1">Achievements</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-900">{activities.filter(a => a.type === "rating").length}</div>
              <p className="text-sm text-blue-600 mt-1">Ratings Received</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-900">30</div>
              <p className="text-sm text-blue-600 mt-1">Days Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Your Journey</CardTitle>
            <CardDescription className="text-blue-600">
              A complete history of your skill swap activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {Object.entries(groupedActivities).map(([date, dayActivities]) => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-4">
                  <Badge className="bg-blue-100 text-blue-900 border-blue-200">
                    {date}
                  </Badge>
                  <div className="flex-1 h-px bg-blue-200" />
                </div>

                <div className="space-y-4 relative pl-8">
                  {/* Vertical timeline line */}
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-blue-200" />

                  {dayActivities.map((activity, index) => {
                    const Icon = activity.icon;
                    const colors = getColorClasses(activity.color);
                    return (
                      <div key={activity.id} className="relative">
                        {/* Timeline dot */}
                        <div className={`absolute -left-8 top-3 size-6 rounded-full ${colors.bg} ${colors.border} border-2 flex items-center justify-center`}>
                          <Icon className={`size-3 ${colors.text}`} />
                        </div>

                        <div className={`p-4 rounded-lg border ${colors.border} ${colors.bg} bg-opacity-30`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-blue-900">{activity.title}</h4>
                              <p className="text-sm text-blue-600 mt-1">{activity.description}</p>
                              
                              {activity.details && (
                                <div className="flex items-center gap-3 mt-2">
                                  {activity.details.rating && (
                                    <div className="flex items-center gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`size-3 ${
                                            i < activity.details.rating!
                                              ? "fill-yellow-400 text-yellow-400"
                                              : "text-gray-300"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                  {activity.details.skill && (
                                    <Badge className="text-xs bg-white text-blue-900 border-blue-200">
                                      {activity.details.skill}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-blue-400 whitespace-nowrap ml-4">
                              {activity.timestamp}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Export Options */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">Export Your Timeline</h4>
              <p className="text-sm text-blue-600">Download your activity history for your records</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => alert("Exporting as PDF...")}
                className="border-blue-200 text-blue-600"
              >
                Export as PDF
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => alert("Exporting as CSV...")}
                className="border-blue-200 text-blue-600"
              >
                Export as CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
