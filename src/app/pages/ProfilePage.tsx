import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Star, LogOut, Loader2, Save, Repeat, Camera } from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function ProfilePage() {
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("Prefer not to say");
  const [avatarUrl, setAvatarUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem("knoxite_token");
      if (!token) { navigate("/"); return; }

      const response = await fetch(`${API_BASE_URL}/profile/`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true" 
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setName(data.name || "");
        setBio(data.bio || "");
        setGender(data.gender || "Prefer not to say");
        setAvatarUrl(data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name.replace(/\s+/g, '')}`);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Smart Image Upload & Compression Logic ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject files larger than 5MB before even processing
    if (file.size > 5 * 1024 * 1024) { 
      alert("Please select an image smaller than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create a dynamic canvas to resize the image
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; // Profile pics don't need to be huge
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio while shrinking
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Compress to JPEG format at 70% quality (Massive size reduction!)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setAvatarUrl(compressedBase64);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem("knoxite_token");
      
      // ✅ Explicitly construct the URL without a trailing slash
      const url = `${API_BASE_URL}/profile/update`;
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({ 
          name, 
          bio, 
          gender, 
          avatarUrl // Send the new image string to the backend
        })
      });

      if (response.ok) {
        alert("Profile updated successfully!");
        fetchUserProfile(); 
      } else {
        alert("Failed to update profile. Please check connection.");
      }
    } catch (error) {
      console.error("Save failed", error);
      alert("A system error occurred.");
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
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin size-10 text-blue-600 mb-4" />
        <span className="text-slate-600 font-bold">Synchronizing Profile Data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="size-5 text-slate-600" />
            </Button>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-red-600 font-bold text-xs">
            <LogOut className="size-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-8">
        
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
          <CardContent className="pt-8 px-6 pb-6">
            
            {/* Identity & Avatar Section */}
            <div className="flex flex-col items-center text-center mb-10">
              <div className="relative group mb-4">
                <Avatar className="size-32 border-4 border-slate-50 shadow-md ring-1 ring-slate-200">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="bg-slate-100 text-slate-600 text-3xl font-bold">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Upload Trigger Button */}
                <button 
                  type="button" // Prevents the button from triggering form submission
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2.5 rounded-full shadow-lg border-2 border-white hover:bg-blue-700 transition-colors"
                >
                  <Camera className="size-5" />
                </button>
                {/* Hidden File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                />
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900">{profile?.name}</h2>
              <p className="text-slate-500 text-sm font-medium">{profile?.email}</p>
              
              {/* Performance Stats */}
              <div className="flex justify-center gap-12 mt-6 py-4 border-y border-slate-100 w-full max-w-sm">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block mb-1">Peer Rating</span>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="size-4 fill-amber-400 text-amber-400" /> 
                    <span className="text-xl font-bold text-slate-900">{profile?.rating > 0 ? profile.rating : "0.0"}</span>
                  </div>
                </div>
                <div className="text-center border-l border-slate-100 pl-12">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block mb-1">Rotations</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <Repeat className="size-4 text-blue-600" />
                    <span className="text-xl font-bold text-slate-900">{profile?.swapsCount || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Update Form */}
            <form onSubmit={handleSave} className="space-y-6 max-w-md mx-auto">
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Display Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-slate-200 focus:ring-blue-600 h-12 text-slate-900 font-medium rounded-lg"
                />
              </div>

              {/* NEW: Gender Selection Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="gender" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Gender Identity</Label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-12 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Academic Biography</Label>
                <textarea
                  id="bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Summarize your academic strengths and learning goals..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[120px] resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-lg font-bold shadow-sm"
                >
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 size-5" />}
                  Save Profile Configuration
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}