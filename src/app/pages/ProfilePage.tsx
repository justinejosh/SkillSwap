import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Star, Shield, LogOut } from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@example.com");
  const [bio, setBio] = useState("Passionate about learning and sharing skills!");

  const offeredSkills = ["Web Development", "Graphic Design", "Photography"];
  const wantedSkills = ["Piano", "Spanish", "Cooking"];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Profile updated successfully!");
  };

  const handleSignOut = () => {
    // Clear any stored user data (in a real app, this would clear tokens, etc.)
    if (confirm("Are you sure you want to sign out?")) {
      localStorage.clear();
      sessionStorage.clear();
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="size-6" />
          </Button>
          <h1 className="text-2xl font-bold text-blue-900">My Profile</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Card */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="size-20">
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=JohnDoe" />
                <AvatarFallback className="bg-blue-200 text-blue-900 text-2xl">JD</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-blue-900">{name}</CardTitle>
                <CardDescription className="text-blue-600">{email}</CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Star className="size-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-blue-600">4.8 rating</span>
                  <span className="text-sm text-blue-400">• 12 swaps completed</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-blue-900">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-blue-900">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-blue-900">Bio</Label>
                <Input
                  id="bio"
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Changes
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate("/security")}
                className="ml-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Shield className="mr-2 size-4" />
                Security Settings
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSignOut}
                className="ml-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <LogOut className="mr-2 size-4" />
                Sign Out
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Skills Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Offered Skills */}
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Skills I Offer</CardTitle>
              <CardDescription className="text-blue-600">
                What I can teach others
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {offeredSkills.map((skill, index) => (
                  <Badge key={index} className="bg-blue-100 text-blue-900 hover:bg-blue-200">
                    {skill}
                  </Badge>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate("/my-skills")}
                  className="border-blue-300 text-blue-600"
                >
                  + Add Skill
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/my-skills")}
                className="w-full mt-3 text-blue-600 hover:bg-blue-50"
              >
                Manage all skills →
              </Button>
            </CardContent>
          </Card>

          {/* Wanted Skills */}
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Skills I Want</CardTitle>
              <CardDescription className="text-blue-600">
                What I want to learn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {wantedSkills.map((skill, index) => (
                  <Badge key={index} className="bg-green-100 text-green-900 hover:bg-green-200">
                    {skill}
                  </Badge>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate("/my-skills")}
                  className="border-blue-300 text-blue-600"
                >
                  + Add Skill
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/my-skills")}
                className="w-full mt-3 text-blue-600 hover:bg-blue-50"
              >
                Manage all skills →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}