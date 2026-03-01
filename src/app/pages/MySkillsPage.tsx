import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, BookOpen, Plus, Trash2, Edit, Code, Music, Palette, Globe, Camera, Utensils, TrendingUp } from "lucide-react";

export default function MySkillsPage() {
  const navigate = useNavigate();
  
  // Modal states
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [skillType, setSkillType] = useState<"offer" | "want">("offer");
  
  // Real Database States
  const [offeredSkills, setOfferedSkills] = useState<any[]>([]);
  const [wantedSkills, setWantedSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for adding a new skill
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("technology");

  // 1. FETCH SKILLS ON PAGE LOAD
  useEffect(() => {
    fetchMySkills();
  }, []);

  const fetchMySkills = async () => {
    try {
      const token = localStorage.getItem("knoxite_token");
      if (!token) {
        navigate("/login"); // Boot them out if they aren't logged in
        return;
      }

      const response = await fetch("http://localhost:5000/api/profile", {
        headers: { "Authorization": `Bearer ${token}` }
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

  // 2. ADD A NEW SKILL TO MYSQL
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    try {
      const token = localStorage.getItem("knoxite_token");
      
      // Determine which endpoint to hit based on the dropdown
      const endpoint = skillType === "offer" 
        ? "http://localhost:5000/api/profile/skills/offer"
        : "http://localhost:5000/api/profile/skills/want";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newSkillName, 
          category: newSkillCategory 
        })
      });

      if (response.ok) {
        // Refresh the lists directly from the database
        fetchMySkills(); 
        setIsAddSkillOpen(false);
        setNewSkillName(""); // Reset form
      } else {
        alert("Failed to add skill. Please try again.");
      }
    } catch (error) {
      console.error("Error adding skill:", error);
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
    return <div className="flex justify-center items-center min-h-screen">Loading your skills...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-blue-600">
              <ArrowLeft className="size-6" />
            </Button>
            <div className="flex items-center gap-3">
              <BookOpen className="size-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">My Skills</h1>
            </div>
          </div>
          
          <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 size-4" /> Add New Skill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Skill</DialogTitle>
                <DialogDescription>Add a skill you want to offer or learn</DialogDescription>
              </DialogHeader>
              
              {/* THE REAL FORM CONNECTED TO MYSQL */}
              <form className="space-y-4 mt-4" onSubmit={handleAddSkill}>
                <div className="space-y-2">
                  <Label>Skill Type</Label>
                  <Select value={skillType} onValueChange={(val: any) => setSkillType(val)}>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offer">I can teach this (Offer)</SelectItem>
                      <SelectItem value="want">I want to learn this (Want)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Skill Name</Label>
                  <Input 
                    placeholder="e.g., React, Python, Guitar..." 
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    required
                    className="border-blue-200" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newSkillCategory} onValueChange={setNewSkillCategory}>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 size-4" /> Save to Database
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 mt-6">
        <Tabs defaultValue="offered" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-white border border-blue-100">
            <TabsTrigger value="offered" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Skills I Offer
            </TabsTrigger>
            <TabsTrigger value="wanted" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Skills I Want
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offered">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offeredSkills.length === 0 ? (
                <p className="text-gray-500">You haven't added any skills to offer yet.</p>
              ) : (
                offeredSkills.map((skill) => (
                  <Card key={skill.id} className="bg-white/90 border-blue-100">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg text-blue-900 capitalize">{skill.name}</CardTitle>
                        <Badge className="bg-blue-100 text-blue-800 capitalize">{skill.category}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="wanted">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wantedSkills.length === 0 ? (
                <p className="text-gray-500">You haven't added any skills to learn yet.</p>
              ) : (
                wantedSkills.map((skill) => (
                  <Card key={skill.id} className="bg-white/90 border-blue-100">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg text-blue-900 capitalize">{skill.name}</CardTitle>
                        <Badge className="bg-green-100 text-green-800 capitalize">{skill.category}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}