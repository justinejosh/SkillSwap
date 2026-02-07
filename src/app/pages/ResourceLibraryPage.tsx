import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, BookOpen, Search, Download, ExternalLink, FileText, Video, Link as LinkIcon, Star } from "lucide-react";

export default function ResourceLibraryPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const tutorials = [
    {
      id: 1,
      title: "Complete Web Development Roadmap 2024",
      author: "Sarah Johnson",
      type: "Tutorial",
      format: "PDF",
      description: "Step-by-step guide to becoming a full-stack developer",
      downloads: 234,
      rating: 4.8,
      category: "Programming",
    },
    {
      id: 2,
      title: "Guitar Basics for Beginners",
      author: "Mike Chen",
      type: "Tutorial",
      format: "Video",
      description: "Learn to play your first chords and songs",
      downloads: 189,
      rating: 4.9,
      category: "Music",
    },
    {
      id: 3,
      title: "Photography Composition Guide",
      author: "Emma Davis",
      type: "Tutorial",
      format: "PDF",
      description: "Master the rule of thirds, leading lines, and more",
      downloads: 156,
      rating: 4.7,
      category: "Photography",
    },
  ];

  const courses = [
    {
      id: 1,
      title: "Python for Data Science",
      author: "Alex Thompson",
      type: "Course",
      format: "Link",
      description: "Free Coursera course on Python fundamentals for data analysis",
      downloads: 312,
      rating: 4.9,
      category: "Programming",
      url: "https://coursera.org/python-data-science",
    },
    {
      id: 2,
      title: "Spanish Conversation Practice",
      author: "Lisa Martinez",
      type: "Course",
      format: "Link",
      description: "Free Duolingo course for conversational Spanish",
      downloads: 278,
      rating: 4.6,
      category: "Languages",
      url: "https://duolingo.com/spanish",
    },
    {
      id: 3,
      title: "Digital Marketing Fundamentals",
      author: "David Kim",
      type: "Course",
      format: "Link",
      description: "Google's free digital marketing certification course",
      downloads: 245,
      rating: 4.8,
      category: "Marketing",
      url: "https://google.com/marketing",
    },
  ];

  const materials = [
    {
      id: 1,
      title: "JavaScript Cheat Sheet",
      author: "Rachel Green",
      type: "Material",
      format: "PDF",
      description: "Quick reference guide for JavaScript syntax and methods",
      downloads: 421,
      rating: 4.9,
      category: "Programming",
    },
    {
      id: 2,
      title: "Cooking Measurement Conversions",
      author: "Tom Brown",
      type: "Material",
      format: "PDF",
      description: "Handy chart for metric and imperial cooking measurements",
      downloads: 167,
      rating: 4.5,
      category: "Cooking",
    },
    {
      id: 3,
      title: "UI/UX Design Principles",
      author: "Sophia Taylor",
      type: "Material",
      format: "PDF",
      description: "Essential design principles and best practices",
      downloads: 298,
      rating: 4.8,
      category: "Design",
    },
  ];

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "PDF":
        return <FileText className="size-5 text-red-600" />;
      case "Video":
        return <Video className="size-5 text-purple-600" />;
      case "Link":
        return <LinkIcon className="size-5 text-blue-600" />;
      default:
        return <FileText className="size-5 text-gray-600" />;
    }
  };

  const renderResourceCard = (resource: any) => (
    <Card key={resource.id} className="bg-white/90 backdrop-blur border-blue-100 hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">{getFormatIcon(resource.format)}</div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-blue-900">{resource.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="size-6">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${resource.author}`} />
                      <AvatarFallback className="bg-blue-200 text-blue-900 text-xs">
                        {resource.author.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-blue-600">{resource.author}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {resource.category}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-blue-700">{resource.description}</p>
        
        <div className="flex items-center justify-between pt-3 border-t border-blue-100">
          <div className="flex items-center gap-4 text-sm text-blue-600">
            <div className="flex items-center gap-1">
              <Download className="size-4" />
              <span>{resource.downloads}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="size-4 fill-yellow-400 text-yellow-400" />
              <span>{resource.rating}</span>
            </div>
          </div>
          
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {resource.format === "Link" ? (
              <>
                <ExternalLink className="mr-2 size-4" />
                Open Link
              </>
            ) : (
              <>
                <Download className="mr-2 size-4" />
                Download
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
          <div className="flex items-center gap-2">
            <BookOpen className="size-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-blue-900">Resource Library</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Search */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 size-5" />
              <Input
                type="search"
                placeholder="Search resources by title, author, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-blue-200 focus:border-blue-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0">
            <CardContent className="p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Tutorials</p>
                  <h3 className="text-3xl font-bold">{tutorials.length}</h3>
                </div>
                <FileText className="size-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0">
            <CardContent className="p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Courses</p>
                  <h3 className="text-3xl font-bold">{courses.length}</h3>
                </div>
                <Video className="size-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600 to-green-700 border-0">
            <CardContent className="p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Materials</p>
                  <h3 className="text-3xl font-bold">{materials.length}</h3>
                </div>
                <BookOpen className="size-12 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tutorials" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-blue-100">
            <TabsTrigger value="tutorials" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <FileText className="mr-2 size-4" />
              Tutorials
            </TabsTrigger>
            <TabsTrigger value="courses" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Video className="mr-2 size-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="materials" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BookOpen className="mr-2 size-4" />
              Materials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tutorials" className="space-y-4">
            {tutorials.map(renderResourceCard)}
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            {courses.map(renderResourceCard)}
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            {materials.map(renderResourceCard)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
