import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Heart, MessageCircle, Send, Plus } from "lucide-react";

interface Post {
  id: number;
  author: string;
  avatar: string;
  offering: string;
  wanting: string;
  description: string;
  likes: number;
  comments: number;
  timestamp: string;
  liked: boolean;
}

export default function MarketplacePage() {
  const navigate = useNavigate();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    offering: "",
    wanting: "",
    description: "",
  });

  const [posts, setPosts] = useState<Post[]>([
    {
      id: 1,
      author: "Alice Johnson",
      avatar: "AJ",
      offering: "Photoshop",
      wanting: "Piano Lessons",
      description: "I'm a professional graphic designer with 5 years experience. Looking to learn piano from scratch!",
      likes: 24,
      comments: 5,
      timestamp: "2 hours ago",
      liked: false,
    },
    {
      id: 2,
      author: "Bob Williams",
      avatar: "BW",
      offering: "Python Programming",
      wanting: "Cooking",
      description: "Full-stack developer here. Want to learn how to cook healthy meals. Can teach Python, Django, React.",
      likes: 18,
      comments: 3,
      timestamp: "5 hours ago",
      liked: true,
    },
    {
      id: 3,
      author: "Carol Davis",
      avatar: "CD",
      offering: "Guitar Lessons",
      wanting: "Spanish",
      description: "Been playing guitar for 10 years. Looking for someone to teach me Spanish for an upcoming trip!",
      likes: 31,
      comments: 8,
      timestamp: "1 day ago",
      liked: false,
    },
  ]);

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, liked: !post.liked, likes: post.liked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  const handleCreatePost = () => {
    if (!newPost.offering || !newPost.wanting || !newPost.description) {
      alert("Please fill all fields");
      return;
    }

    const post: Post = {
      id: Date.now(),
      author: "You",
      avatar: "ME",
      offering: newPost.offering,
      wanting: newPost.wanting,
      description: newPost.description,
      likes: 0,
      comments: 0,
      timestamp: "Just now",
      liked: false,
    };

    setPosts([post, ...posts]);
    setNewPost({ offering: "", wanting: "", description: "" });
    setShowCreatePost(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="size-6" />
            </Button>
            <h1 className="text-2xl font-bold text-blue-900">Skill Marketplace</h1>
          </div>
          <Button
            onClick={() => setShowCreatePost(!showCreatePost)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="mr-2 size-4" />
            Post
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Create Post */}
        {showCreatePost && (
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Create a Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-900">I can teach</label>
                  <Input
                    value={newPost.offering}
                    onChange={(e) => setNewPost({ ...newPost, offering: e.target.value })}
                    placeholder="e.g., Python, Guitar, Cooking"
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-900">I want to learn</label>
                  <Input
                    value={newPost.wanting}
                    onChange={(e) => setNewPost({ ...newPost, wanting: e.target.value })}
                    placeholder="e.g., Spanish, Photography"
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-900">Description</label>
                <Textarea
                  value={newPost.description}
                  onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                  placeholder="Tell others about your skills and what you're looking for..."
                  className="border-blue-200 focus:border-blue-400 min-h-24"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreatePost} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  Post to Marketplace
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreatePost(false)}
                  className="flex-1 border-blue-300 text-blue-600"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feed */}
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="bg-white/90 backdrop-blur border-blue-100">
              <CardContent className="pt-6">
                {/* Author Info */}
                <div className="flex items-start gap-3 mb-4">
                  <Avatar>
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author}`} />
                    <AvatarFallback className="bg-blue-200 text-blue-900">
                      {post.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900">{post.author}</h3>
                    <p className="text-sm text-blue-500">{post.timestamp}</p>
                  </div>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge className="bg-blue-100 text-blue-900">
                    Offering: {post.offering}
                  </Badge>
                  <Badge className="bg-green-100 text-green-900">
                    Seeking: {post.wanting}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-blue-800 mb-4">{post.description}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4 border-t border-blue-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className={post.liked ? "text-red-500" : "text-blue-600"}
                  >
                    <Heart className={`mr-2 size-5 ${post.liked ? "fill-red-500" : ""}`} />
                    {post.likes}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    <MessageCircle className="mr-2 size-5" />
                    {post.comments}
                  </Button>
                  <Button
                    size="sm"
                    className="ml-auto bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => navigate("/swap-agreement")}
                  >
                    <Send className="mr-2 size-4" />
                    Request Swap
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline" className="border-blue-300 text-blue-600">
            Load More Posts
          </Button>
        </div>
      </div>
    </div>
  );
}
