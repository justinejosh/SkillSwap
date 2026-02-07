import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, BookOpen, Plus, Trash2, Edit, CheckCircle, TrendingUp, Award, Target, Star, Brain, Lightbulb, Code, Music, Palette, Globe, Camera, Utensils } from "lucide-react";

export default function MySkillsPage() {
  const navigate = useNavigate();
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [skillType, setSkillType] = useState<"offer" | "want">("offer");
  const [editingSkill, setEditingSkill] = useState<number | null>(null);

  // Mock data for offered skills
  const [offeredSkills, setOfferedSkills] = useState([
    {
      id: 1,
      name: "Web Development",
      category: "Technology",
      level: "Expert",
      yearsExperience: 5,
      verified: true,
      description: "Full-stack development with React, Node.js, and databases",
      studentsTeaching: 12,
      rating: 4.9,
      icon: Code,
    },
    {
      id: 2,
      name: "Graphic Design",
      category: "Creative",
      level: "Intermediate",
      yearsExperience: 3,
      verified: true,
      description: "Logo design, branding, and Adobe Creative Suite",
      studentsTeaching: 8,
      rating: 4.7,
      icon: Palette,
    },
    {
      id: 3,
      name: "Photography",
      category: "Creative",
      level: "Advanced",
      yearsExperience: 4,
      verified: false,
      description: "Portrait and landscape photography, photo editing",
      studentsTeaching: 5,
      rating: 4.8,
      icon: Camera,
    },
  ]);

  // Mock data for wanted skills
  const [wantedSkills, setWantedSkills] = useState([
    {
      id: 1,
      name: "Piano",
      category: "Music",
      desiredLevel: "Intermediate",
      priority: "High",
      description: "Classical piano and music theory",
      icon: Music,
    },
    {
      id: 2,
      name: "Spanish Language",
      category: "Language",
      desiredLevel: "Advanced",
      priority: "High",
      description: "Conversational Spanish and grammar",
      icon: Globe,
    },
    {
      id: 3,
      name: "Cooking",
      category: "Lifestyle",
      desiredLevel: "Beginner",
      priority: "Medium",
      description: "Italian cuisine and baking",
      icon: Utensils,
    },
  ]);

  const categories = [
    { value: "technology", label: "Technology", icon: Code },
    { value: "creative", label: "Creative", icon: Palette },
    { value: "music", label: "Music", icon: Music },
    { value: "language", label: "Language", icon: Globe },
    { value: "lifestyle", label: "Lifestyle", icon: Utensils },
    { value: "business", label: "Business", icon: TrendingUp },
    { value: "academic", label: "Academic", icon: Brain },
    { value: "other", label: "Other", icon: Lightbulb },
  ];

  const skillLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];
  const priorities = ["Low", "Medium", "High"];

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Beginner":
        return "bg-green-100 text-green-700 border-green-200";
      case "Intermediate":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Advanced":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Expert":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-700 border-red-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Low":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Adding new skill to ${skillType === "offer" ? "Offered" : "Wanted"} skills`);
    setIsAddSkillOpen(false);
  };

  const handleDeleteSkill = (id: number, type: "offer" | "want") => {
    if (confirm("Are you sure you want to remove this skill?")) {
      if (type === "offer") {
        setOfferedSkills(offeredSkills.filter(s => s.id !== id));
      } else {
        setWantedSkills(wantedSkills.filter(s => s.id !== id));
      }
    }
  };

  const stats = {
    totalOffered: offeredSkills.length,
    totalWanted: wantedSkills.length,
    verified: offeredSkills.filter(s => s.verified).length,
    totalStudents: offeredSkills.reduce((sum, skill) => sum + skill.studentsTeaching, 0),
    avgRating: (offeredSkills.reduce((sum, skill) => sum + skill.rating, 0) / offeredSkills.length).toFixed(1),
  };

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
              <BookOpen className="size-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">My Skills</h1>
            </div>
          </div>
          <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 size-4" />
                Add New Skill
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Skill</DialogTitle>
                <DialogDescription>
                  Add a skill you want to offer or learn
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4 mt-4" onSubmit={handleAddSkill}>
                <div className="space-y-2">
                  <Label htmlFor="skill-type">Skill Type</Label>
                  <Select value={skillType} onValueChange={(value) => setSkillType(value as "offer" | "want")}>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offer">I can teach this skill</SelectItem>
                      <SelectItem value="want">I want to learn this skill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skill-name">Skill Name</Label>
                  <Input
                    id="skill-name"
                    placeholder="e.g., Web Development, Guitar, Spanish"
                    className="border-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">
                    {skillType === "offer" ? "Your Skill Level" : "Desired Level"}
                  </Label>
                  <Select>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {skillLevels.map((level) => (
                        <SelectItem key={level} value={level.toLowerCase()}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {skillType === "offer" && (
                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input
                      id="experience"
                      type="number"
                      min="0"
                      placeholder="e.g., 3"
                      className="border-blue-200"
                    />
                  </div>
                )}
                {skillType === "want" && (
                  <div className="space-y-2">
                    <Label htmlFor="priority">Learning Priority</Label>
                    <Select>
                      <SelectTrigger className="border-blue-200">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority} value={priority.toLowerCase()}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe this skill in detail..."
                    rows={3}
                    className="border-blue-200"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 size-4" />
                    Add Skill
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddSkillOpen(false)}
                    className="border-blue-200 text-blue-600"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-900">{stats.totalOffered}</div>
              <p className="text-sm text-blue-600 mt-1">Skills I Offer</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-900">{stats.totalWanted}</div>
              <p className="text-sm text-green-600 mt-1">Skills I Want</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-900">{stats.verified}</div>
              <p className="text-sm text-purple-600 mt-1">Verified Skills</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-900">{stats.totalStudents}</div>
              <p className="text-sm text-orange-600 mt-1">Students Taught</p>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-900">{stats.avgRating}</div>
              <p className="text-sm text-yellow-600 mt-1">Avg Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Skills Tabs */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Skill Management</CardTitle>
            <CardDescription className="text-blue-600">
              Manage the skills you offer and want to learn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="offered" className="space-y-6">
              <TabsList className="grid grid-cols-2 w-full bg-blue-50">
                <TabsTrigger value="offered" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Skills I Offer ({offeredSkills.length})
                </TabsTrigger>
                <TabsTrigger value="wanted" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Skills I Want ({wantedSkills.length})
                </TabsTrigger>
              </TabsList>

              {/* Offered Skills */}
              <TabsContent value="offered" className="space-y-4">
                {offeredSkills.map((skill) => {
                  const Icon = skill.icon;
                  return (
                    <div
                      key={skill.id}
                      className="p-5 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-white hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 bg-blue-100 rounded-full">
                            <Icon className="size-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-blue-900">{skill.name}</h3>
                              <Badge className={`${getLevelColor(skill.level)} border`}>
                                {skill.level}
                              </Badge>
                              {skill.verified && (
                                <Badge className="bg-green-500 text-white">
                                  <CheckCircle className="mr-1 size-3" />
                                  Verified
                                </Badge>
                              )}
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                {skill.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-blue-600 mb-3">{skill.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-blue-600">
                                📅 {skill.yearsExperience} years experience
                              </span>
                              <span className="text-blue-600">
                                👥 {skill.studentsTeaching} students
                              </span>
                              <span className="flex items-center gap-1 text-yellow-600">
                                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                                {skill.rating}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          {!skill.verified && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate("/skill-verification")}
                              className="border-purple-200 text-purple-600 hover:bg-purple-50"
                            >
                              <CheckCircle className="mr-1 size-3" />
                              Verify
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSkill(skill.id)}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSkill(skill.id, "offer")}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {offeredSkills.length === 0 && (
                  <div className="text-center py-12 text-blue-400">
                    <BookOpen className="size-12 mx-auto mb-3 opacity-50" />
                    <p>No skills offered yet. Add your first skill to start teaching!</p>
                  </div>
                )}
              </TabsContent>

              {/* Wanted Skills */}
              <TabsContent value="wanted" className="space-y-4">
                {wantedSkills.map((skill) => {
                  const Icon = skill.icon;
                  return (
                    <div
                      key={skill.id}
                      className="p-5 rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-white hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-3 bg-green-100 rounded-full">
                            <Icon className="size-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-blue-900">{skill.name}</h3>
                              <Badge className={`${getLevelColor(skill.desiredLevel)} border`}>
                                Target: {skill.desiredLevel}
                              </Badge>
                              <Badge className={`${getPriorityColor(skill.priority)} border`}>
                                {skill.priority} Priority
                              </Badge>
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                {skill.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-blue-600 mb-3">{skill.description}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => navigate("/marketplace")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Target className="mr-1 size-3" />
                            Find Teachers
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSkill(skill.id)}
                            className="border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSkill(skill.id, "want")}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {wantedSkills.length === 0 && (
                  <div className="text-center py-12 text-green-400">
                    <Target className="size-12 mx-auto mb-3 opacity-50" />
                    <p>No skills added yet. Add skills you want to learn!</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Skill Categories Overview */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Skill Categories</CardTitle>
            <CardDescription className="text-blue-600">
              Browse available skill categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map((category) => {
                const Icon = category.icon;
                const offeredCount = offeredSkills.filter(
                  s => s.category.toLowerCase() === category.value
                ).length;
                const wantedCount = wantedSkills.filter(
                  s => s.category.toLowerCase() === category.value
                ).length;
                return (
                  <div
                    key={category.value}
                    className="p-4 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 rounded">
                        <Icon className="size-4 text-blue-600" />
                      </div>
                      <span className="font-semibold text-blue-900">{category.label}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                        {offeredCount} offered
                      </Badge>
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        {wantedCount} wanted
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Ready to start teaching or learning?</h3>
                <p className="text-blue-100">
                  Add your skills and find the perfect match in our community
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate("/marketplace")}
                  variant="outline"
                  className="bg-white text-blue-600 border-white hover:bg-blue-50"
                >
                  Browse Marketplace
                </Button>
                <Button
                  onClick={() => navigate("/skill-verification")}
                  variant="outline"
                  className="bg-white text-blue-600 border-white hover:bg-blue-50"
                >
                  <CheckCircle className="mr-2 size-4" />
                  Verify Skills
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
