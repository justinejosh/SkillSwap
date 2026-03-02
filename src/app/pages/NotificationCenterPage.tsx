import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { 
  ArrowLeft, 
  Bell, 
  CheckCheck, 
  Users, 
  Check, 
  X, 
  Loader2,
  MessageCircle,
  Clock
} from "lucide-react";

// 1. IMPORT YOUR CONFIG
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
      
      // 2. USE API_BASE_URL AND BYPASS TUNNEL
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

      if (res.ok) {
        fetchSwaps(); 
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Action failed", err);
    }
  };

  const incomingPending = swaps.filter(s => s.receiverId === currentUserId && s.status === "PENDING");
  const outgoingRequests = swaps.filter(s => s.requesterId === currentUserId);
  const historicalSwaps = swaps.filter(s => s.status !== "PENDING");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <header className="bg-white border-b border-blue-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              className="text-blue-600 h-10 w-10"
            >
              <ArrowLeft className="size-6" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-blue-900 leading-tight">Notifications</h1>
              {incomingPending.length > 0 && (
                <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">
                  {incomingPending.length} pending requests
                </p>
              )}
            </div>
          </div>
          <Bell className="size-5 text-blue-300" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Tabs defaultValue="incoming" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full bg-blue-50/50 p-1 rounded-xl border border-blue-100">
            <TabsTrigger value="incoming" className="rounded-lg text-xs md:text-sm">Incoming</TabsTrigger>
            <TabsTrigger value="outgoing" className="rounded-lg text-xs md:text-sm">Sent</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs md:text-sm">History</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : incomingPending.length === 0 ? (
              <EmptyState message="No new requests for you." />
            ) : (
              incomingPending.map((swap) => (
                <SwapRequestItem 
                  key={swap.id} 
                  swap={swap} 
                  isReceiver={true} 
                  onAction={handleSwapAction} 
                  onNavigate={navigate}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-3">
            {outgoingRequests.length === 0 ? (
              <EmptyState message="You haven't sent any invitations." />
            ) : (
              outgoingRequests.map((swap) => (
                <SwapRequestItem 
                  key={swap.id} 
                  swap={swap} 
                  isReceiver={false} 
                  onNavigate={navigate}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {historicalSwaps.length === 0 ? (
              <EmptyState message="Your activity history is empty." />
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
    <Card className={`overflow-hidden border-blue-100 shadow-sm transition-all ${isPending && isReceiver ? "ring-1 ring-blue-400" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full shrink-0 ${isPending ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
            <Users className="size-5" />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-blue-900 text-sm truncate pr-2">
                {partner.name}
              </h3>
              <Badge variant="outline" className={`text-[9px] h-4 px-1 ${
                swap.status === 'ACCEPTED' ? "border-green-200 text-green-600 bg-green-50" : 
                swap.status === 'REJECTED' ? "border-red-200 text-red-600 bg-red-50" : "text-blue-600"
              }`}>
                {swap.status}
              </Badge>
            </div>

            <p className="text-xs text-blue-800 leading-snug mb-3">
              {isReceiver 
                ? `Wants to trade their ${swap.wantedSkill.name} for your ${swap.offeredSkill.name}.`
                : `Waiting for them to trade their ${swap.wantedSkill.name} for your ${swap.offeredSkill.name}.`}
            </p>

            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center gap-1 text-[10px] text-blue-400">
                <Clock className="size-3" /> {new Date(swap.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isPending && isReceiver && onAction ? (
                <>
                  <Button 
                    size="sm" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                    onClick={() => onAction(swap.id, "ACCEPTED")}
                  >
                    <Check className="size-3 mr-1" /> Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="flex-1 text-red-500 hover:bg-red-50 h-8 text-xs"
                    onClick={() => onAction(swap.id, "REJECTED")}
                  >
                    <X className="size-3 mr-1" /> Decline
                  </Button>
                </>
              ) : swap.status === "ACCEPTED" ? (
                <Button 
                  size="sm" 
                  className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 h-8 text-xs font-semibold"
                  onClick={() => onNavigate("/chat")}
                >
                  <MessageCircle className="size-3 mr-1" /> Send Message
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16 bg-white/50 border-2 border-dashed border-blue-50 rounded-2xl">
      <Bell className="size-10 mx-auto mb-2 text-blue-100" />
      <p className="text-xs text-blue-400 font-medium">{message}</p>
    </div>
  );
}