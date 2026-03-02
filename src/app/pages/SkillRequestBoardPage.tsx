import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { ArrowLeft, MessageSquare, Plus, Search, Clock, Loader2, Filter } from "lucide-react";

// 1. IMPORT YOUR CONFIG
import { API_BASE_URL } from "@/config";

export default function SkillRequestBoardPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({ looking: "", offering: "", description: "" });
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const userString = localStorage.getItem("knoxite_user");
    if (userString) {
      setCurrentUserId(JSON.parse(userString).id);
    }
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("knoxite_token");
      
      // 2. USE API_BASE_URL AND BYPASS TUNNEL
      const response = await fetch(`${API_BASE_URL}/board`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostRequest = async () => {
    if (!newRequest.looking || !newRequest.offering) {
      alert("Please fill in the required fields.");
      return;
    }

    setIsPosting(true);
    try {
      const token = localStorage.getItem("knoxite_token");
      const response = await fetch(`${API_BASE_URL}/board`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true"
        },
        body: JSON.stringify(newRequest)
      });

      if (response.ok) {
        setNewRequest({ looking: "", offering: "", description: "" });
        setIsDialogOpen(false);
        fetchRequests(); 
      }
    } catch (error) {
      alert("Failed to post request.");
    } finally {
      setIsPosting(false);
    }
  };

  const filteredRequests = requests.filter((request) =>
    request.looking.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.offering.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 pb-20">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-blue-600 h-10 w-10">
              <ArrowLeft className="size-6" />
            </Button>
            <h1 className="text-lg font-bold text-blue-900 leading-none">Request Board</h1>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4">
                <Plus className="mr-1 size-4" /> Post
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95%] rounded-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-blue-900">Broadcasting Request</DialogTitle>
                <DialogDescription>What skill are you hunting for today?</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-blue-400 uppercase">Looking For</Label>
                  <Input 
                    value={newRequest.looking} 
                    onChange={(e) => setNewRequest({...newRequest, looking: e.target.value})}
                    placeholder="e.g. Guitar Lessons" 
                    className="bg-blue-50/50 border-blue-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-blue-400 uppercase">In Exchange For</Label>
                  <Input 
                    value={newRequest.offering} 
                    onChange={(e) => setNewRequest({...newRequest, offering: e.target.value})}
                    placeholder="e.g. Web Design" 
                    className="bg-blue-50/50 border-blue-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-blue-400 uppercase">Description</Label>
                  <Textarea 
                    value={newRequest.description} 
                    onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                    placeholder="Tell us more about what you need..." 
                    className="bg-blue-50/50 border-blue-100 min-h-[100px]"
                  />
                </div>
                <Button onClick={handlePostRequest} className="w-full bg-blue-600 h-12 text-base font-bold" disabled={isPosting}>
                  {isPosting ? <Loader2 className="animate-spin" /> : "Publish to Board"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-blue-600 size-5 transition-colors" />
          <Input
            placeholder="Search skills or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-white/80 border-blue-100 shadow-sm rounded-xl focus:ring-blue-500"
          />
        </div>

        {/* Board Content */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-600 size-10 mb-2" />
              <p className="text-blue-400 text-sm font-medium">Scanning the board...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-20 bg-white/50 border-2 border-dashed border-blue-100 rounded-3xl">
              <MessageSquare className="size-12 mx-auto mb-4 text-blue-100" />
              <p className="text-blue-400 font-medium">No requests match your search.</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id} className="bg-white/90 border-blue-50 shadow-sm hover:shadow-md transition-all active:scale-[0.99] overflow-hidden rounded-2xl">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 border border-blue-100">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${request.author.name}`} />
                        <AvatarFallback className="bg-blue-100 text-blue-700">{request.author.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-blue-900 text-sm">{request.author.name}</h3>
                        <p className="text-[10px] text-blue-400 flex items-center gap-1 font-medium">
                          <Clock className="size-3" />
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {request.authorId === currentUserId && (
                       <Badge className="bg-blue-600 text-[10px] uppercase font-bold">My Post</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-red-50 p-2 rounded-lg border border-red-100/50">
                       <p className="text-[9px] uppercase font-black text-red-400 mb-0.5">Looking For</p>
                       <p className="text-xs font-bold text-red-700 truncate">{request.looking}</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded-lg border border-green-100/50">
                       <p className="text-[9px] uppercase font-black text-green-400 mb-0.5">Can Teach</p>
                       <p className="text-xs font-bold text-green-700 truncate">{request.offering}</p>
                    </div>
                  </div>
                  
                  <p className="text-blue-800 text-xs leading-relaxed line-clamp-3 bg-blue-50/30 p-2 rounded-md">
                    {request.description}
                  </p>
                  
                  <div className="flex items-center gap-2 pt-1">
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 text-xs font-bold shadow-md shadow-blue-100"
                      onClick={() => navigate("/marketplace")}
                    >
                      Offer Help
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-9 w-9 border-blue-100 text-blue-400"
                    >
                      <MessageSquare className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}