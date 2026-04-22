import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import { 
  ArrowLeft, Users, Activity, TrendingUp, 
  CheckCircle2, Loader2, BookOpen, Clock, ArrowLeftRight 
} from "lucide-react";
import { API_BASE_URL } from "@/config";

// --- Type Definitions for Data Integrity ---
interface AnalyticsData {
  systemHealth: {
    totalUsers: number;
    totalSwaps: number;
    totalReviews: number;
  };
  swapMetrics: {
    completedSwaps: number;
    activeSwaps: number;
    pendingSwaps: number;
    completionRate: number;
  };
  skillTrends: {
    topWanted: { name: string; count: number }[];
    topOffered: { name: string; count: number }[];
  };
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("knoxite_token");
        if (!token) {
          navigate("/");
          return;
        }

        const res = await fetch(`${API_BASE_URL}/analytics`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "bypass-tunnel-reminder": "true" 
          }
        });

        if (res.ok) {
          const fetchedData = await res.json();
          setData(fetchedData);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [navigate]);

  if (isLoading || !data) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin size-10 text-blue-600 mb-4" />
        <p className="text-slate-600 font-semibold tracking-tight">Aggregating System Metrics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      {/* Header Segment */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")} className="rounded-full">
              <ArrowLeft className="size-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Analytics</h1>
              <p className="text-xs text-slate-500 font-medium">Real-time data aggregation and network health</p>
            </div>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3 font-bold">
            <Activity className="size-3.5 mr-1.5" /> Live Data
          </Badge>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* 1. Key Performance Indicators (KPIs) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Network Users</p>
                <h3 className="text-3xl font-bold text-slate-900">{data.systemHealth.totalUsers}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Rotations</p>
                <h3 className="text-3xl font-bold text-slate-900">{data.systemHealth.totalSwaps}</h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <ArrowLeftRight className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Completion Rate</p>
                <h3 className="text-3xl font-bold text-slate-900">{data.swapMetrics.completionRate}%</h3>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="size-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Peer Evaluations</p>
                <h3 className="text-3xl font-bold text-slate-900">{data.systemHealth.totalReviews}</h3>
              </div>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <TrendingUp className="size-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. Complex Data Visualization Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Skill Demographics (Marketplace Needs) */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg text-slate-900">Skill Distribution Trends</CardTitle>
              <CardDescription>Comparative analysis of supply (offered) versus demand (wanted) within the academic hub.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Demand (Wanted) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="size-5 text-blue-600" />
                    <h4 className="font-bold text-slate-800">High Demand Skills</h4>
                  </div>
                  {data.skillTrends.topWanted.length > 0 ? (
                    data.skillTrends.topWanted.map((skill, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-700">{skill.name}</span>
                          <span className="font-bold text-blue-600">{skill.count} Requests</span>
                        </div>
                        <Progress value={Math.min((skill.count / Math.max(data.systemHealth.totalUsers, 1)) * 100, 100)} className="h-1.5 bg-slate-100" />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 italic">Insufficient data for trend analysis.</p>
                  )}
                </div>

                {/* Supply (Offered) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <h4 className="font-bold text-slate-800">High Supply Skills</h4>
                  </div>
                  {data.skillTrends.topOffered.length > 0 ? (
                    data.skillTrends.topOffered.map((skill, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-700">{skill.name}</span>
                          <span className="font-bold text-emerald-600">{skill.count} Offerings</span>
                        </div>
                        <Progress value={Math.min((skill.count / Math.max(data.systemHealth.totalUsers, 1)) * 100, 100)} className="h-1.5 bg-slate-100 [&>div]:bg-emerald-500" />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 italic">Insufficient data for trend analysis.</p>
                  )}
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Column 3: Rotation Lifecycle Status */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg text-slate-900">Rotation Status Overview</CardTitle>
              <CardDescription>Current state of all initiated skill exchanges.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-slate-100 rounded-lg shrink-0">
                  <Clock className="size-5 text-slate-600" />
                </div>
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-slate-700">Pending Agreement</span>
                    <span className="font-bold text-slate-900">{data.swapMetrics.pendingSwaps}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Awaiting user confirmation</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-blue-50 rounded-lg shrink-0">
                  <Activity className="size-5 text-blue-600" />
                </div>
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-slate-700">Active Rotations</span>
                    <span className="font-bold text-slate-900">{data.swapMetrics.activeSwaps}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Sessions currently in progress</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-emerald-50 rounded-lg shrink-0">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                </div>
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-slate-700">Completed & Verified</span>
                    <span className="font-bold text-slate-900">{data.swapMetrics.completedSwaps}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Successfully concluded exchanges</p>
                </div>
              </div>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}