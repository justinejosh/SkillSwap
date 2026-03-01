
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { 
  ArrowLeft, 
  Users, 
  ArrowLeftRight, 
  TrendingUp, 
  AlertCircle,
  Search,
  Ban,
  CheckCircle2
} from "lucide-react";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const stats = {
    totalUsers: 1247,
    activeSwaps: 89,
    completedSwaps: 456,
    reportedIssues: 3,
    topSkills: [
      { name: "Web Development", count: 234 },
      { name: "Graphic Design", count: 189 },
      { name: "Python", count: 156 },
      { name: "Photography", count: 142 },
      { name: "Guitar", count: 128 },
    ],
  };

  const recentUsers = [
    { id: 1, name: "John Doe", email: "john@example.com", joined: "2 days ago", status: "active" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", joined: "3 days ago", status: "active" },
    { id: 3, name: "Bob Wilson", email: "bob@example.com", joined: "5 days ago", status: "suspended" },
  ];

  const activeSwaps = [
    { id: 1, user1: "Alice", user2: "Bob", skill: "Piano ↔ Photoshop", status: "In Progress", progress: 60 },
    { id: 2, user1: "Carol", user2: "Dave", skill: "Guitar ↔ Python", status: "In Progress", progress: 40 },
    { id: 3, user1: "Eve", user2: "Frank", skill: "Cooking ↔ Spanish", status: "Pending", progress: 0 },
  ];

  const reportedIssues = [
    { id: 1, reporter: "Alice", reported: "Bob", reason: "No-show", date: "1 hour ago", status: "pending" },
    { id: 2, reporter: "Carol", reported: "Dave", reason: "Inappropriate behavior", date: "3 hours ago", status: "pending" },
    { id: 3, reporter: "Eve", reported: "Frank", reason: "Poor quality", date: "1 day ago", status: "resolved" },
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
            <h1 className="text-2xl font-bold text-blue-900">Admin Dashboard</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 size-5" />
            <Input
              type="search"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-blue-200 focus:border-blue-400 w-64"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Total Users</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.totalUsers}</p>
                </div>
                <Users className="size-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Active Swaps</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.activeSwaps}</p>
                </div>
                <ArrowLeftRight className="size-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Completed</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.completedSwaps}</p>
                </div>
                <TrendingUp className="size-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Reported Issues</p>
                  <p className="text-3xl font-bold text-blue-900">{stats.reportedIssues}</p>
                </div>
                <AlertCircle className="size-10 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Recent Users</CardTitle>
              <CardDescription className="text-blue-600">
                Newly registered members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-blue-50/50">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                        <AvatarFallback className="bg-blue-200 text-blue-900">
                          {user.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-blue-900">{user.name}</h3>
                        <p className="text-sm text-blue-600">{user.email}</p>
                        <span className="text-xs text-blue-500">{user.joined}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {user.status === "active" ? (
                        <Badge className="bg-green-100 text-green-900">Active</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-900">Suspended</Badge>
                      )}
                      <Button variant="ghost" size="icon" className="text-red-500">
                        <Ban className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Skills */}
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Top Skills</CardTitle>
              <CardDescription className="text-blue-600">
                Most popular skills on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topSkills.map((skill, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-8 rounded-full bg-blue-100 text-blue-900 font-medium">
                        {index + 1}
                      </div>
                      <span className="text-blue-900">{skill.name}</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-900">{skill.count} users</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Swaps */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Active Skill Swaps</CardTitle>
            <CardDescription className="text-blue-600">
              Currently ongoing exchanges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSwaps.map((swap) => (
                <div key={swap.id} className="p-4 rounded-lg border border-blue-100 bg-blue-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-blue-900">{swap.user1} ↔ {swap.user2}</h3>
                      <p className="text-sm text-blue-600">{swap.skill}</p>
                    </div>
                    <Badge className={swap.status === "In Progress" ? "bg-yellow-100 text-yellow-900" : "bg-blue-100 text-blue-900"}>
                      {swap.status}
                    </Badge>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${swap.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-1">{swap.progress}% complete</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reported Issues */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-blue-900">Reported Issues</CardTitle>
                <CardDescription className="text-blue-600">
                  Issues requiring admin attention
                </CardDescription>
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => navigate("/report")}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                View All Reports
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportedIssues.map((issue) => (
                <div key={issue.id} className="p-4 rounded-lg border border-blue-100 bg-blue-50/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-blue-900">{issue.reporter} reported {issue.reported}</h3>
                        <Badge className={issue.status === "pending" ? "bg-yellow-100 text-yellow-900" : "bg-green-100 text-green-900"}>
                          {issue.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-blue-600 mt-1">Reason: {issue.reason}</p>
                      <span className="text-xs text-blue-500">{issue.date}</span>
                    </div>
                    {issue.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="border-green-300 text-green-600">
                          <CheckCircle2 className="size-4 mr-1" />
                          Resolve
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-300 text-red-600">
                          <Ban className="size-4 mr-1" />
                          Ban User
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}