import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Shield, Smartphone, Key, Monitor, CheckCircle2, Clock, Loader2, Lock } from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function SecurityPage() {
  const navigate = useNavigate();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("knoxite_token");
        
        const res = await fetch(`${API_BASE_URL}/auth/sessions`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "bypass-tunnel-reminder": "true" 
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setSessions(data); // Will be [] if Ashton's DB is empty
        } else {
          setSessions([]); // Explicitly empty on error/no-data
        }
      } catch (err) {
        console.error("Security fetch error:", err);
        setSessions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-blue-600">
            <ArrowLeft className="size-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="size-6 text-blue-600" />
            <h1 className="text-xl font-bold text-blue-900">Security Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Change Password Card */}
        <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="size-5 text-blue-600" />
              <CardTitle className="text-blue-900 font-bold">Account Access</CardTitle>
            </div>
            <span className="text-sm text-blue-500 mt-1 block font-medium">Manage your password and authentication methods</span>
          </CardHeader>
          <CardContent className="space-y-5">
             {/* ... Password Inputs here ... */}
             <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-8">
              Update Security
            </Button>
          </CardContent>
        </Card>

        {/* Dynamic Login Activity Section */}
        <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="size-5 text-blue-600" />
              <CardTitle className="text-blue-900 font-bold">Login Activity</CardTitle>
            </div>
            <span className="text-sm text-blue-500 mt-1 block font-medium">Recent login attempts and active sessions</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center py-16">
                <Loader2 className="animate-spin text-blue-600 size-10 mb-4" />
                <span className="text-sm text-blue-400 font-bold tracking-wide">Syncing security data...</span>
              </div>
            ) : sessions.length === 0 ? (
              /* THE "TRUE" EMPTY STATE */
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-blue-50 rounded-2xl bg-blue-50/10">
                <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                  <Lock className="size-8 text-blue-200" />
                </div>
                <span className="text-lg font-bold text-blue-900 block">
                  No Active Sessions Found
                </span>
                <span className="text-sm text-blue-400 mt-2 block max-w-xs">
                  Your login history is currently empty. New sessions will appear here as you log in from different devices.
                </span>
              </div>
            ) : (
              sessions.map((activity) => (
                /* ... Render Activity Cards ... */
                <div key={activity.id}>{/* Session Logic */}</div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}