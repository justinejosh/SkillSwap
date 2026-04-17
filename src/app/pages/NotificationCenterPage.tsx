import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { 
  ArrowLeft, 
  Bell, 
  Users, 
  Check, 
  X, 
  Loader2,
  MessageCircle,
  Clock,
  Search // Added Search icon for the empty state action
} from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const [swaps, setSwaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const userString = localStorage.getItem("knoxite_user");
    if (userString) {
      setCurrentUserId(JSON.parse(userString).id);
    }
    fetchSwaps();
  }, []);

  const fetchSwaps = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("knoxite_token");
      const res = await fetch(`${API_BASE_URL}/swaps`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true" 
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSwaps(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapAction = async (swapId: string, status: "ACCEPTED" | "REJECTED") => {
    try {
      const token = localStorage.getItem("knoxite_token");
      const res = await fetch(`${API_BASE_URL}/swaps/${swapId}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "bypass-tunnel-reminder": "true" 
        },
        body: JSON.stringify({ newStatus: status })
      });

      if (res.ok) fetchSwaps(); 
    } catch (err) {
      console.error("Action failed", err);
    }
  };

  const incomingPending = swaps.filter(s => s.receiverId === currentUserId && s.status === "PENDING");
  const outgoingRequests = swaps.filter(s => s.requesterId === currentUserId);
  const historicalSwaps = swaps.filter(s => s.status !== "PENDING");

  // --- REUSABLE FORMATTED EMPTY STATE ---
  const renderEmptyState = (message: string) => (
    <Card className="bg-white/90 backdrop-blur border-blue-100 shadow-sm py-16">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <div className="p-4 bg-blue-50 rounded-full mb-4">
          <Bell className="size-10 text-blue-300" />
        </div>
        <span className="text-lg md:text-xl font-bold text-blue-900 block">
          {message}
        </span>
        <span className="text-sm text-blue-500 mt-2 block max-w-xs">
          Explore the marketplace to find new mentors to swap skills with!
        </span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/knox-hub")}
          className="mt-6 border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          <Search className="mr-2 size-4" />
          <span>Explore Marketplace</span>
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-blue-600">
              <ArrowLeft className="size-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-blue-900 leading-tight">Notifications</h1>
              {incomingPending.length > 0 && (
                <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider block">
                  {incomingPending.length} pending requests
                </span>
              )}
            </div>
          </div>
          <Bell className="size-6 text-blue-300" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <Tabs defaultValue="incoming" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full bg-white border border-blue-100 h-12 p-1 rounded-xl">
            <TabsTrigger value="incoming" className="rounded-lg text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">Incoming</TabsTrigger>
            <TabsTrigger value="outgoing" className="rounded-lg text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">Sent</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">History</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin size-10 text-blue-600" /></div>
            ) : incomingPending.length === 0 ? (
              renderEmptyState("No new requests for you.")
            ) : (
              incomingPending.map((swap) => (
                <SwapRequestItem key={swap.id} swap={swap} isReceiver={true} onAction={handleSwapAction} onNavigate={navigate} />
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-4">
            {outgoingRequests.length === 0 ? (
              renderEmptyState("You haven't sent any invitations.")
            ) : (
              outgoingRequests.map((swap) => (
                <SwapRequestItem key={swap.id} swap={swap} isReceiver={false} onNavigate={navigate} />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {historicalSwaps.length === 0 ? (
              renderEmptyState("Your activity history is empty.")
            ) : (
              historicalSwaps.map((swap) => (
                <SwapRequestItem 
                  key={swap.id} 
                  swap={swap} 
                  isReceiver={swap.receiverId === currentUserId} 
                  onNavigate={navigate} 
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SwapRequestItem({ swap, isReceiver, onAction, onNavigate }: any) {
  const isPending = swap.status === "PENDING";
  const partner = isReceiver ? swap.requester : swap.receiver;

  return (
    <Card className={`overflow-hidden border-blue-100 shadow-sm transition-all hover:border-blue-300 ${isPending && isReceiver ? "ring-1 ring-blue-400" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full shrink-0 ${isPending ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"}`}>
            <Users className="size-6" />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-blue-900 text-base md:text-lg truncate">
                {partner.name}
              </span>
              <Badge variant="outline" className={`text-[10px] h-5 px-2 uppercase font-bold ${
                swap.status === 'ACCEPTED' ? "border-green-200 text-green-600 bg-green-50" : 
                swap.status === 'REJECTED' ? "border-red-200 text-red-600 bg-red-50" : "text-blue-600 border-blue-200"
              }`}>
                {swap.status}
              </Badge>
            </div>

            <span className="text-sm md:text-base text-blue-800 leading-relaxed block mb-4">
              {isReceiver 
                ? `Wants to trade their ${swap.wantedSkill.name} for your ${swap.offeredSkill.name}.`
                : `Waiting for them to trade their ${swap.wantedSkill.name} for your ${swap.offeredSkill.name}.`}
            </span>

            <div className="flex items-center gap-4 mb-4">
              <span className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
                <Clock className="size-3.5" /> 
                {new Date(swap.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div className="flex gap-3">
              {isPending && isReceiver && onAction ? (
                <>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10 text-sm font-semibold"
                    onClick={() => onAction(swap.id, "ACCEPTED")}
                  >
                    <Check className="size-4 mr-2" /> Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="flex-1 text-red-500 hover:bg-red-50 h-10 text-sm font-semibold"
                    onClick={() => onAction(swap.id, "REJECTED")}
                  >
                    <X className="size-4 mr-2" /> Decline
                  </Button>
                </>
              ) : swap.status === "ACCEPTED" ? (
                <Button 
                  size="sm" 
                  className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 h-10 text-sm font-bold"
                  onClick={() => onNavigate("/chat")}
                >
                  <MessageCircle className="size-4 mr-2" /> Send Message
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}