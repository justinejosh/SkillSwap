import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, BookOpen, Plus, Trash2, Code, Music, Palette, Globe, Utensils, TrendingUp, Loader2 } from "lucide-react";

// 1. IMPORT YOUR CONFIG
import { API_BASE_URL } from "@/config";

export default function MySkillsPage() {
  const navigate = useNavigate();
  
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [skillType, setSkillType] = useState<"offer" | "want">("offer");
  const [offeredSkills, setOfferedSkills] = useState<any[]>([]);
  const [wantedSkills, setWantedSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("technology");

  useEffect(() => {
    fetchMySkills();
  }, []);

  const fetchMySkills = async () => {
    try {
      const token = localStorage.getItem("knoxite_token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/profile`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true" 
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        setOfferedSkills(data.offeredSkills || []);
        setWantedSkills(data.wantedSkills || []);
      }
    } catch (error) {
      console.error("Failed to fetch skills", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    try {
      const token = localStorage.getItem("knoxite_token");
      const endpoint = skillType === "offer" 
        ? `${API_BASE_URL}/profile/skills/offer`
        : `${API_BASE_URL}/profile/skills/want`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify({ 
          name: newSkillName, 
          category: newSkillCategory 
        })
      });

      if (response.ok) {
        fetchMySkills(); 
        setIsAddSkillOpen(false);
        setNewSkillName("");
      } else {
        alert("Failed to add skill.");
      }
    } catch (error) {
      console.error("Error adding skill:", error);
    }
  };

  // NEW: Delete functionality for easier testing
  const handleDeleteSkill = async (id: number, type: "offer" | "want") => {
    if (!confirm("Remove this skill?")) return;
    try {
      const token = localStorage.getItem("knoxite_token");
      const response = await fetch(`${API_BASE_URL}/profile/skills/${type}/${id}`, {
        method: "DELETE",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true" 
        }
      });
      if (response.ok) fetchMySkills();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const categories = [
    { value: "technology", label: "Technology", icon: Code },
    { value: "creative", label: "Creative", icon: Palette },
    { value: "music", label: "Music", icon: Music },
    { value: "language", label: "Language", icon: Globe },
    { value: "lifestyle", label: "Lifestyle", icon: Utensils },
    { value: "business", label: "Business", icon: TrendingUp },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-blue-50">
        <Loader2 className="animate-spin size-8 text-blue-600 mb-2" />
        <p className="text-blue-900">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-blue-600">
              <ArrowLeft className="size-6" />
            </Button>
            <h1 className="text-xl font-bold text-blue-900">My Skills</h1>
          </div>
          
          <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4">
                <Plus className="size-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>Add New Skill</DialogTitle>
                <DialogDescription>Expand your trading profile</DialogDescription>
              </DialogHeader>
              
              <form className="space-y-4 mt-2" onSubmit={handleAddSkill}>
                <div className="space-y-2">
                  <Label className="text-xs">I want to...</Label>
                  <Select value={skillType} onValueChange={(val: any) => setSkillType(val)}>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offer">Teach/Offer a skill</SelectItem>
                      <SelectItem value="want">Learn/Request a skill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Skill Name</Label>
                  <Input 
                    placeholder="e.g., UI Design, Spanish..." 
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    required
                    className="border-blue-200" 
                  />
                </div>
                <div className="space-y-2 pb-2">
                  <Label className="text-xs">Category</Label>
                  <Select value={newSkillCategory} onValueChange={setNewSkillCategory}>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12">
                  Save Skill
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="offered" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-blue-50/50 p-1 rounded-xl">
            <TabsTrigger value="offered" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
              Teaching
            </TabsTrigger>
            <TabsTrigger value="wanted" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm">
              Learning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offered" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {offeredSkills.length === 0 ? (
                <EmptyState message="You haven't added anything to teach yet." />
              ) : (
                offeredSkills.map((skill) => (
                  <SkillCard 
                    key={skill.id} 
                    skill={skill} 
                    onDelete={() => handleDeleteSkill(skill.id, "offer")} 
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="wanted" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wantedSkills.length === 0 ? (
                <EmptyState message="What would you like to learn?" />
              ) : (
                wantedSkills.map((skill) => (
                  <SkillCard 
                    key={skill.id} 
                    skill={skill} 
                    variant="green"
                    onDelete={() => handleDeleteSkill(skill.id, "want")} 
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Sub-components for cleaner code
function SkillCard({ skill, onDelete, variant = "blue" }: { skill: any, onDelete: () => void, variant?: "blue" | "green" }) {
  const colorClass = variant === "blue" ? "text-blue-600 bg-blue-50" : "text-emerald-600 bg-emerald-50";
  return (
    <Card className="bg-white border-blue-100 shadow-sm overflow-hidden group">
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
        <div className="min-w-0">
          <CardTitle className="text-base font-bold text-blue-900 capitalize truncate">{skill.name}</CardTitle>
          <Badge className={`mt-1 font-normal text-[10px] uppercase tracking-wider border-none ${colorClass}`}>
            {skill.category}
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onDelete}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="size-4" />
        </Button>
      </CardHeader>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full py-12 text-center">
      <div className="bg-blue-50 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <BookOpen className="text-blue-200 size-8" />
      </div>
      <p className="text-blue-400 text-sm italic">{message}</p>
    </div>
  );
}