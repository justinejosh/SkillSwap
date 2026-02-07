import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, Star } from "lucide-react";

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
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: 1,
      with: "Alice Johnson",
      avatar: "AJ",
      skill: "Photoshop Tutorial",
      date: "2026-02-01",
      time: "2:00 PM",
      location: "Online",
      status: "upcoming",
    },
    {
      id: 2,
      with: "Bob Williams",
      avatar: "BW",
      skill: "Python Basics",
      date: "2026-02-03",
      time: "4:00 PM",
      location: "Coffee Shop",
      status: "upcoming",
    },
    {
      id: 3,
      with: "Carol Davis",
      avatar: "CD",
      skill: "Guitar Lesson",
      date: "2026-01-25",
      time: "3:00 PM",
      location: "Music Studio",
      status: "completed",
      rating: 5,
    },
    {
      id: 4,
      with: "Dave Wilson",
      avatar: "DW",
      skill: "Spanish Conversation",
      date: "2026-01-20",
      time: "6:00 PM",
      location: "Online",
      status: "completed",
      rating: 4,
    },
  ]);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const handleMarkComplete = (session: Session) => {
    setSelectedSession(session);
    setShowRatingModal(true);
  };

  const handleRateSession = (rating: number) => {
    if (selectedSession) {
      setSessions(sessions.map(s => 
        s.id === selectedSession.id 
          ? { ...s, status: "completed" as const, rating }
          : s
      ));
      setShowRatingModal(false);
      setSelectedSession(null);
    }
  };

  const upcomingSessions = sessions.filter(s => s.status === "upcoming");
  const completedSessions = sessions.filter(s => s.status === "completed");

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
        {/* Stats */}
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
                <div className="text-3xl font-bold text-blue-900">{completedSessions.length * 2}h</div>
                <p className="text-sm text-blue-600 mt-1">Total Learning Time</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Upcoming Sessions</CardTitle>
            <CardDescription className="text-blue-600">
              Your scheduled skill swap sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingSessions.length === 0 ? (
              <p className="text-center text-blue-600 py-8">No upcoming sessions scheduled</p>
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
                          <h3 className="font-medium text-blue-900">{session.skill}</h3>
                          <p className="text-sm text-blue-600">with {session.with}</p>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-900">
                          {session.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-blue-600">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="size-4" />
                          {new Date(session.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
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
                      <div className="flex gap-2 mt-3">
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

        {/* Completed Sessions */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Completed Sessions</CardTitle>
            <CardDescription className="text-blue-600">
              Your past skill swaps and ratings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {completedSessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-lg border border-blue-100 bg-green-50/30"
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
                        <h3 className="font-medium text-blue-900">{session.skill}</h3>
                        <p className="text-sm text-blue-600">with {session.with}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-900">
                        Completed
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-blue-600">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="size-4" />
                        {new Date(session.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="size-4" />
                        {session.time}
                      </div>
                    </div>
                    {session.rating && (
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-sm text-blue-600">Your rating:</span>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`size-4 ${
                              i < session.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Rating Modal */}
        {showRatingModal && selectedSession && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md bg-white">
              <CardHeader>
                <CardTitle className="text-blue-900">Rate Your Session</CardTitle>
                <CardDescription className="text-blue-600">
                  How was your session with {selectedSession.with}?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => handleRateSession(rating)}
                      className="hover:scale-110 transition-transform"
                    >
                      <Star className="size-12 fill-yellow-400 text-yellow-400 hover:scale-110" />
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowRatingModal(false)}
                  className="w-full border-blue-300 text-blue-600"
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
