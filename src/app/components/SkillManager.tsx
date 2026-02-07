import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { X, Plus } from "lucide-react";

interface Skill {
  id: number;
  name: string;
  level: "beginner" | "intermediate" | "expert";
}

export function SkillManager({ type }: { type: "offered" | "wanted" }) {
  const [skills, setSkills] = useState<Skill[]>([
    { id: 1, name: "Web Development", level: "expert" },
    { id: 2, name: "Graphic Design", level: "intermediate" },
  ]);
  
  const [newSkill, setNewSkill] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<"beginner" | "intermediate" | "expert">("beginner");
  const [showAddForm, setShowAddForm] = useState(false);

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-100 text-green-900";
      case "intermediate":
        return "bg-yellow-100 text-yellow-900";
      case "expert":
        return "bg-blue-100 text-blue-900";
      default:
        return "bg-gray-100 text-gray-900";
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "beginner":
        return "⭐";
      case "intermediate":
        return "⭐⭐";
      case "expert":
        return "⭐⭐⭐";
      default:
        return "";
    }
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    
    const skill: Skill = {
      id: Date.now(),
      name: newSkill,
      level: newSkillLevel,
    };
    
    setSkills([...skills, skill]);
    setNewSkill("");
    setNewSkillLevel("beginner");
    setShowAddForm(false);
  };

  const handleRemoveSkill = (id: number) => {
    setSkills(skills.filter((s) => s.id !== id));
  };

  return (
    <Card className="bg-white/90 backdrop-blur border-blue-100">
      <CardHeader>
        <CardTitle className="text-blue-900">
          {type === "offered" ? "Skills I Offer" : "Skills I Want to Learn"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Skills List */}
        <div className="space-y-2">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-blue-50/50"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-900">{skill.name}</span>
                <Badge className={getLevelColor(skill.level)}>
                  {getLevelBadge(skill.level)} {skill.level}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveSkill(skill.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add Skill Form */}
        {showAddForm ? (
          <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-white">
            <div className="space-y-2">
              <Label htmlFor="skillName" className="text-blue-900">Skill Name</Label>
              <Input
                id="skillName"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="e.g., Python, Guitar, Cooking"
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skillLevel" className="text-blue-900">Skill Level</Label>
              <Select value={newSkillLevel} onValueChange={(value: any) => setNewSkillLevel(value)}>
                <SelectTrigger className="border-blue-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">⭐ Beginner</SelectItem>
                  <SelectItem value="intermediate">⭐⭐ Intermediate</SelectItem>
                  <SelectItem value="expert">⭐⭐⭐ Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddSkill}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add Skill
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="flex-1 border-blue-300 text-blue-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            <Plus className="mr-2 size-4" />
            Add New Skill
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
