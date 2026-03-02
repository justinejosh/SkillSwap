import { useState, useEffect } from "react"; // Added useEffect
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { ArrowLeft, MessageCircle, Plus, Search, ThumbsUp, MessageSquare, Lightbulb, BookOpen, Clock } from "lucide-react";

// 1. IMPORT YOUR CONFIG
import { API_BASE_URL } from "@/config";

export default function CommunityForumPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "discussion" });
  
  // 2. State for real data (Initially using your mock data)
  const [discussions, setDiscussions] = useState([
    {
      id: 1,
      author: "Sarah Johnson",
      title: "Best practices for virtual skill swaps?",
      content: "What tools and methods do you use to make online skill exchanges effective?",
      category: "Discussion",
      replies: 15,
      likes: 23,
      timeAgo: "3 hours ago",
    },
    {
      id: 2,
      author: "Mike Chen",
      title: "How to deal with no-shows?",
      content: "Any advice on handling people who don't show up for scheduled sessions?",
      category: "Discussion",
      replies: 8,
      likes: 12,
      timeAgo: "5 hours ago",
    }
  ]);

  const tips = [
    {
      id: 1,
      author: "Alex Thompson",
      title: "5 Tips for Better Online Teaching",
      content: "1. Use screen sharing effectively\n2. Prepare materials in advance\n3. Keep sessions interactive...",
      category: "Tips",
      replies: 6,
      likes: 31,
      timeAgo: "2 days ago",
    }
  ];

  const resources = [
    {
      id: 1,
      author: "David Kim",
      title: "Free Online Whiteboard Tools",
      content: "Collection of the best free whiteboard apps for teaching: Miro, Jamboard, Excalidraw...",
      category: "Resources",
      replies: 9,
      likes: 28,
      timeAgo: "1 day ago",
    }
  ];

  // 3. Example Fetch Logic for when you have a /api/forum endpoint
  /*
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/forum`, {
            headers: { "bypass-tunnel-reminder": "true" }
        });
        const data = await res.json();
        setDiscussions(data);
      } catch (err) {
        console.error("Failed to fetch forum posts", err);
      }
    };
    fetchPosts();
  }, []);
  */

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const token = localStorage.getItem("knoxite_token");
      // 4. Use API_BASE_URL for creating posts
      const res = await fetch(`${API_BASE_URL}/board/post`, { // Adjust endpoint as needed
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify(newPost)
      });

      if (res.ok) {
        alert("Post created successfully!");
        setNewPost({ title: "", content: "", category: "discussion" });
        setIsDialogOpen(false);
      }
    } catch (err) {
      console.error("Post creation failed", err);
      // Fallback for demo if backend isn't ready
      alert("Post created (Demo Mode)");
      setIsDialogOpen(false);
    }
  };

  const renderPostCard = (post: any) => (
    <Card key={post.id} className="bg-white/90 backdrop-blur border-blue-100 hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Avatar>
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author}`} />
              <AvatarFallback className="bg-blue-200 text-blue-900">
                {post.author.split(" ").map((n: string) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-blue-900 truncate">{post.title}</h3>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {post.category}
                </Badge>
              </div>
              <p className="text-sm text-blue-600">{post.author}</p>
              <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                <Clock className="size-3" />
                {post.timeAgo}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-blue-700 whitespace-pre-line text-sm md:text-base">{post.content}</p>
        
        <div className="flex items-center gap-4 pt-3 border-t border-blue-100">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
          >
            <ThumbsUp className="mr-1 md:mr-2 size-4" />
            {post.likes} <span className="hidden xs:inline">Likes</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
          >
            <MessageSquare className="mr-1 md:mr-2 size-4" />
            {post.replies} <span className="hidden xs:inline">Replies</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="size-6" />
            </Button>
            <div className="flex items-center gap-2">
              <MessageCircle className="size-5 md:size-6 text-blue-600" />
              <h1 className="text-lg md:text-2xl font-bold text-blue-900 truncate">Forum</h1>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white size-sm md:size-default">
                <Plus className="md:mr-2 size-4" />
                <span className="hidden md:inline">New Post</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md w-[95vw] rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-blue-900">Create New Post</DialogTitle>
                <DialogDescription className="text-blue-600">
                  Share your thoughts with the community
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-blue-900">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter post title"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content" className="text-blue-900">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="What's on your mind?"
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    className="border-blue-200 focus:border-blue-400 min-h-32"
                  />
                </div>
                <Button 
                  onClick={handleCreatePost}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Create Post
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Search */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardContent className="p-3 md:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 size-5" />
              <Input
                type="search"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-blue-200 focus:border-blue-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="discussions" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-white border border-blue-100 h-auto p-1">
            <TabsTrigger value="discussions" className="py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm">
              <MessageCircle className="mr-1 md:mr-2 size-4" />
              Discussions
            </TabsTrigger>
            <TabsTrigger value="tips" className="py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm">
              <Lightbulb className="mr-1 md:mr-2 size-4" />
              Tips
            </TabsTrigger>
            <TabsTrigger value="resources" className="py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs md:text-sm">
              <BookOpen className="mr-1 md:mr-2 size-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discussions" className="space-y-4 outline-none">
            {discussions.map(renderPostCard)}
          </TabsContent>

          <TabsContent value="tips" className="space-y-4 outline-none">
            {tips.map(renderPostCard)}
          </TabsContent>

          <TabsContent value="resources" className="space-y-4 outline-none">
            {resources.map(renderPostCard)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}