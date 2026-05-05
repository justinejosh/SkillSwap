import { useState, useEffect } from "react";
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
  Loader2
} from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSwaps: 0,
    completedSwaps: 0,
    reportedIssues: 0,
  });

  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem("knoxite_token");
      
      const response = await fetch(`${API_BASE_URL}/admin/dashboard-data`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalUsers: data.stats.totalUsers,
          activeSwaps: data.stats.activeSwaps,
          completedSwaps: data.stats.completedSwaps,
          reportedIssues: data.stats.reportedIssues,
        });
        setRecentUsers(data.recentUsers);
      } else {
        console.error("Failed to fetch admin data. Status:", response.status);
      }
    } catch (error) {
      console.error("Network error while fetching admin data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you absolutely sure you want to ban ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("knoxite_token");
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchAdminData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to ban user.");
      }
    } catch (error) {
      console.error("Error banning user:", error);
      alert("A network error occurred.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-blue-50">
        <Loader2 className="animate-spin text-blue-600 size-10 mb-4" />
        <p className="text-blue-900 font-black italic tracking-tighter uppercase">Loading Admin Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
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
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 size-5" />
            <Input
              type="search"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-blue-200 focus:border-blue-400 w-64 rounded-xl"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Total Users</p>
                  <p className="text-4xl font-black text-blue-900">{stats.totalUsers}</p>
                </div>
                <Users className="size-10 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Active Swaps</p>
                  <p className="text-4xl font-black text-blue-900">{stats.activeSwaps}</p>
                </div>
                <ArrowLeftRight className="size-10 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Completed</p>
                  <p className="text-4xl font-black text-blue-900">{stats.completedSwaps}</p>
                </div>
                <TrendingUp className="size-10 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-600 uppercase tracking-wider">Reports</p>
                  <p className="text-4xl font-black text-blue-900">{stats.reportedIssues}</p>
                </div>
                <AlertCircle className="size-10 text-red-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real Data Tables */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-blue-50/50 border-b border-blue-50">
              <CardTitle className="text-blue-900 font-black">User Directory</CardTitle>
              <CardDescription className="text-blue-600 font-medium">
                Manage registered Knoxite members
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {recentUsers.length === 0 ? (
                <div className="p-8 text-center text-blue-400 font-medium italic">
                  No users found in the database.
                </div>
              ) : (
                <div className="divide-y divide-blue-50">
                  {recentUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 hover:bg-blue-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <Avatar className="size-10 ring-2 ring-blue-100">
                          {/* 🚀 FIXED: Now checks for user.avatarUrl before falling back to Dicebear */}
                          <AvatarImage src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                          <AvatarFallback className="bg-blue-600 text-white font-bold">
                            {user.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-blue-900">{user.name}</h3>
                          <p className="text-xs text-blue-500 font-medium">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={user.role === "ADMIN" ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}>
                          {user.role || "USER"}
                        </Badge>
                        {user.role !== "ADMIN" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleBanUser(user.id, user.name)}
                            className="text-red-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                          >
                            <Ban className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}