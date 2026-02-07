import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { ArrowLeft, MessageSquare, Plus, Search, Clock } from "lucide-react";

export default function SkillRequestBoardPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [newRequest, setNewRequest] = useState({ looking: "", offering: "", description: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const requests = [
    {
      id: 1,
      author: "Alice Johnson",
      looking: "Java Programming",
      offering: "Cooking & Baking",
      description: "Looking for someone to teach me Java basics. I can teach you how to cook delicious Italian dishes!",
      comments: 5,
      timeAgo: "2 hours ago",
    },
    {
      id: 2,
      author: "Bob Williams",
      looking: "Spanish Language",
      offering: "Guitar Lessons",
      description: "Want to learn conversational Spanish. I'm an experienced guitar teacher willing to trade lessons.",
      comments: 8,
      timeAgo: "5 hours ago",
    },
    {
      id: 3,
      author: "Carol Davis",
      looking: "Photography",
      offering: "Graphic Design",
      description: "Seeking photography mentor for portrait and landscape. Can help with Adobe Photoshop and Illustrator.",
      comments: 3,
      timeAgo: "1 day ago",
    },
    {
      id: 4,
      author: "David Martinez",
      looking: "Piano",
      offering: "Web Development",
      description: "Complete beginner looking for piano lessons. I can teach HTML, CSS, JavaScript, and React.",
      comments: 12,
      timeAgo: "1 day ago",
    },
    {
      id: 5,
      author: "Emma Wilson",
      looking: "Public Speaking",
      offering: "Digital Marketing",
      description: "Want to improve presentation skills. I have 5 years experience in SEO and social media marketing.",
      comments: 6,
      timeAgo: "2 days ago",
    },
  ];

  const handlePostRequest = () => {
    if (!newRequest.looking || !newRequest.offering) {
      alert("Please fill in what you're looking for and what you're offering");
      return;
    }
    alert("Request posted successfully!");
    setNewRequest({ looking: "", offering: "", description: "" });
    setIsDialogOpen(false);
  };

  const filteredRequests = requests.filter((request) =>
    request.looking.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.offering.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div className="flex items-center gap-2">
              <MessageSquare className="size-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">Skill Request Board</h1>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="mr-2 size-4" />
                Post Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-blue-900">Post Skill Request</DialogTitle>
                <DialogDescription className="text-blue-600">
                  Let others know what skill you're looking for and what you can offer in return
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="looking" className="text-blue-900">Looking For</Label>
                  <Input
                    id="looking"
                    placeholder="e.g., Piano Lessons"
                    value={newRequest.looking}
                    onChange={(e) => setNewRequest({ ...newRequest, looking: e.target.value })}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offering" className="text-blue-900">Can Teach</Label>
                  <Input
                    id="offering"
                    placeholder="e.g., Web Development"
                    value={newRequest.offering}
                    onChange={(e) => setNewRequest({ ...newRequest, offering: e.target.value })}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-blue-900">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Add more details about your request..."
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    className="border-blue-200 focus:border-blue-400 min-h-24"
                  />
                </div>
                <Button 
                  onClick={handlePostRequest}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Post Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Search */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 size-5" />
              <Input
                type="search"
                placeholder="Search requests by skill or person..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-blue-200 focus:border-blue-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="bg-white/90 backdrop-blur border-blue-100 hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${request.author}`} />
                      <AvatarFallback className="bg-blue-200 text-blue-900">
                        {request.author.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-blue-900">{request.author}</h3>
                      <p className="text-xs text-blue-500 flex items-center gap-1">
                        <Clock className="size-3" />
                        {request.timeAgo}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-red-100 text-red-800">
                    Looking: {request.looking}
                  </Badge>
                  <Badge className="bg-green-100 text-green-800">
                    Offering: {request.offering}
                  </Badge>
                </div>
                
                <p className="text-blue-700">{request.description}</p>
                
                <div className="flex items-center justify-between pt-3 border-t border-blue-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <MessageSquare className="mr-2 size-4" />
                    {request.comments} Comments
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Offer Help
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
