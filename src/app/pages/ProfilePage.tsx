import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Star, Shield, LogOut, Loader2, Save } from "lucide-react";

// 1. IMPORT YOUR CONFIG
import { API_BASE_URL } from "@/config";

export default function ProfilePage() {
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("knoxite_token");
      if (!token) {
        navigate("/");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/profile`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true" 
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
        setBio(data.bio || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("knoxite_token");
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT", // Or PATCH depending on your backend
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({ name, bio })
      });

      if (response.ok) {
        alert("Profile updated successfully!");
        fetchUserProfile(); // Refresh data
      }
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    if (confirm("Are you sure you want to sign out?")) {
      localStorage.removeItem("knoxite_token");
      localStorage.removeItem("knoxite_user");
      navigate("/");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-blue-50">
        <Loader2 className="animate-spin size-8 text-blue-600 mb-2" />
        <p className="text-blue-900 font-medium">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="text-blue-600 h-10 w-10"
            >
              <ArrowLeft className="size-6" />
            </Button>
            <h1 className="text-xl font-bold text-blue-900">My Profile</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut} 
            className="text-red-500 hover:bg-red-50 text-xs font-bold"
          >
            <LogOut className="size-4 mr-1" /> EXIT
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* User Identity Card */}
        <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center mb-6">
              <Avatar className="size-24 border-4 border-white shadow-md mb-3">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/\s+/g, '')}`} />
                <AvatarFallback className="bg-blue-600 text-white text-3xl">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold text-blue-900">{profile?.name}</h2>
              <p className="text-blue-500 text-sm">{profile?.email}</p>
              
              <div className="flex gap-4 mt-4">
                <div className="text-center">
                  <p className="text-xs text-blue-400 uppercase font-bold tracking-widest">Rating</p>
                  <div className="flex items-center justify-center gap-1 text-blue-900 font-bold">
                    <Star className="size-3 fill-yellow-400 text-yellow-400" /> 4.8
                  </div>
                </div>
                <div className="w-px h-8 bg-blue-100" />
                <div className="text-center">
                  <p className="text-xs text-blue-400 uppercase font-bold tracking-widest">Swaps</p>
                  <p className="text-blue-900 font-bold">12</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-blue-400 uppercase ml-1">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-blue-50/30 border-blue-100 focus:ring-blue-500 h-11"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-xs font-bold text-blue-400 uppercase ml-1">About Me</Label>
                <textarea
                  id="bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community what you're looking for..."
                  className="w-full rounded-md border border-blue-100 bg-blue-50/30 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 shadow-md shadow-blue-200"
              >
                {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 size-4" />}
                Update Profile Info
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Skills Quick-View Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkillSummaryCard 
            title="Skills I Offer" 
            skills={profile?.offeredSkills} 
            color="blue" 
            onManage={() => navigate("/my-skills")} 
          />
          <SkillSummaryCard 
            title="Skills I Want" 
            skills={profile?.wantedSkills} 
            color="emerald" 
            onManage={() => navigate("/my-skills")} 
          />
        </div>
      </div>
    </div>
  );
}

// Sub-component for the skill previews
function SkillSummaryCard({ title, skills, color, onManage }: any) {
  const isBlue = color === "blue";
  return (
    <Card className="bg-white border-blue-100 shadow-sm">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-bold text-blue-900">{title}</CardTitle>
        <Badge variant="outline" className="text-[10px] font-bold">{skills?.length || 0}</Badge>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {skills?.length === 0 ? (
            <p className="text-xs text-blue-300 italic">No skills listed yet.</p>
          ) : (
            skills?.slice(0, 5).map((skill: any) => (
              <Badge 
                key={skill.id} 
                className={`${isBlue ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'} border-none text-[10px] py-0 capitalize`}
              >
                {skill.name}
              </Badge>
            ))
          )}
          {skills?.length > 5 && <span className="text-[10px] text-blue-400">+{skills.length - 5} more</span>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onManage}
          className="w-full h-8 text-xs text-blue-600 hover:bg-blue-50 border border-blue-50"
        >
          Manage Skills
        </Button>
      </CardContent>
    </Card>
  );
}