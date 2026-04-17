import { useState, useEffect } from "react"; // Added useEffect
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, Star, Loader2 } from "lucide-react";

interface Session {
  id: number;
  with: string;
  avatar: string;
  skill: string;
  date: string;
  time: string;
  location: string;
  status: "upcoming" | "completed" | "pending";
  rating?: number;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  
  // --- DYNAMIC STATE ---
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // --- FETCH DATA FROM BACKEND ---
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:5000/api/user/sessions");
        const data = await response.json();
        setSessions(data);
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // --- HANDLERS ---
  const handleMarkComplete = (session: Session) => {
    setSelectedSession(session);
    setShowRatingModal(true);
  };

  const handleRateSession = async (rating: number) => {
    if (selectedSession) {
      try {
        // Optimistic UI update
        setSessions(sessions.map(s => 
          s.id === selectedSession.id 
            ? { ...s, status: "completed" as const, rating }
            : s
        ));

        // Sync with Backend
        await fetch(`http://localhost:5000/api/sessions/${selectedSession.id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating }),
        });

      } catch (error) {
        console.error("Update failed:", error);
      } finally {
        setShowRatingModal(false);
        setSelectedSession(null);
      }
    }
  };

  const upcomingSessions = sessions.filter(s => s.status === "upcoming");
  const completedSessions = sessions.filter(s => s.status === "completed");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <Loader2 className="animate-spin size-10 text-blue-600" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-blue-900">My Calendar & Sessions</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats Section - Now Dynamically Calculated */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-900">{upcomingSessions.length}</div>
                <p className="text-sm text-blue-600 mt-1">Upcoming Sessions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-900">{completedSessions.length}</div>
                <p className="text-sm text-blue-600 mt-1">Completed Sessions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardContent className="pt-6">
              <div className="text-center">
                {/* Logic: Each completed session is roughly 2 hours for now */}
                <div className="text-3xl font-bold text-blue-900">{completedSessions.length * 2}h</div>
                <p className="text-sm text-blue-600 mt-1">Total Learning Time</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions Section */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Upcoming Sessions</CardTitle>
            <CardDescription className="text-blue-600">
              Your scheduled skill swap sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingSessions.length === 0 ? (
              <p className="text-center text-blue-400 py-12">No upcoming sessions. Start a swap!</p>
            ) : (
              upcomingSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-lg border border-blue-100 bg-blue-50/50"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="size-12">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.with}`} />
                      <AvatarFallback className="bg-blue-200 text-blue-900">
                        {session.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-blue-900">{session.skill}</h3>
                          <p className="text-sm text-blue-600">with {session.with}</p>
                        </div>
                        <Badge className="bg-blue-600 text-white uppercase text-[10px]">
                          {session.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-blue-600">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="size-4" />
                          {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="size-4" />
                          {session.time}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="size-4" />
                          {session.location}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() => handleMarkComplete(session)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle2 className="mr-2 size-4" />
                          Mark as Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-300 text-blue-600"
                        >
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Completed Sessions Section */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Completed Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {completedSessions.length === 0 ? (
              <p className="text-center text-blue-400 py-8">No completed sessions yet.</p>
            ) : (
              completedSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 rounded-lg border border-blue-50 bg-white"
                >
                  <div className="flex items-start gap-4 opacity-80">
                    <Avatar className="size-10">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${session.with}`} />
                      <AvatarFallback>{session.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-blue-900">{session.skill}</h4>
                          <p className="text-xs text-blue-600">with {session.with}</p>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-200">Done</Badge>
                      </div>
                      {session.rating && (
                        <div className="flex items-center gap-1 mt-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3 ${i < session.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Rating Modal (Remains same logic) */}
        {showRatingModal && selectedSession && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white border-blue-100 shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-blue-900">Session Finished!</CardTitle>
                <CardDescription>
                  Help the community by rating your session with {selectedSession.with}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleRateSession(num)}
                      className="transition-transform hover:scale-125"
                    >
                      <Star className="size-10 fill-yellow-400 text-yellow-400" />
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowRatingModal(false)}
                  className="w-full text-blue-400"
                >
                  Close without rating
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}