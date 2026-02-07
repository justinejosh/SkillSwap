import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, Bell, CheckCheck, Trash2, MessageCircle, Calendar, Trophy, AlertTriangle, Users, Star, Gift } from "lucide-react";

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "message",
      title: "New message from Alice Johnson",
      description: "Hi! I'd love to swap Python lessons for your guitar skills.",
      time: "2 minutes ago",
      read: false,
      icon: MessageCircle,
      color: "blue"
    },
    {
      id: 2,
      type: "swap",
      title: "Swap request accepted",
      description: "Bob Williams accepted your swap request for cooking lessons.",
      time: "1 hour ago",
      read: false,
      icon: Users,
      color: "green"
    },
    {
      id: 3,
      type: "calendar",
      title: "Upcoming session reminder",
      description: "Your Spanish lesson with Maria starts in 3 hours.",
      time: "3 hours ago",
      read: true,
      icon: Calendar,
      color: "purple"
    },
    {
      id: 4,
      type: "achievement",
      title: "New achievement unlocked!",
      description: "You've earned the 'Quick Learner' badge for completing 5 swaps.",
      time: "5 hours ago",
      read: true,
      icon: Trophy,
      color: "yellow"
    },
    {
      id: 5,
      type: "rating",
      title: "New rating received",
      description: "David Chen gave you 5 stars for your photography lessons!",
      time: "1 day ago",
      read: true,
      icon: Star,
      color: "orange"
    },
    {
      id: 6,
      type: "system",
      title: "Profile verification reminder",
      description: "Verify your skills to increase your match rate by 40%.",
      time: "2 days ago",
      read: true,
      icon: AlertTriangle,
      color: "red"
    },
    {
      id: 7,
      type: "reward",
      title: "Bonus credits earned",
      description: "You've earned 50 bonus points for active participation this week!",
      time: "3 days ago",
      read: true,
      icon: Gift,
      color: "pink"
    },
  ]);

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filterNotifications = (type?: string) => {
    if (!type || type === "all") return notifications;
    return notifications.filter(n => n.type === type);
  };

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600",
      purple: "bg-purple-100 text-purple-600",
      yellow: "bg-yellow-100 text-yellow-600",
      orange: "bg-orange-100 text-orange-600",
      red: "bg-red-100 text-red-600",
      pink: "bg-pink-100 text-pink-600",
    };
    return colors[color] || colors.blue;
  };

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
            <div className="flex items-center gap-3">
              <Bell className="size-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">Notification Center</h1>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">
                  {unreadCount} new
                </Badge>
              )}
            </div>
          </div>
          <Button
            onClick={markAllAsRead}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
            disabled={unreadCount === 0}
          >
            <CheckCheck className="mr-2 size-4" />
            Mark all as read
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4">
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">All Notifications</CardTitle>
            <CardDescription className="text-blue-600">
              Stay updated with your skill swap activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="grid grid-cols-5 w-full bg-blue-50">
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  All
                </TabsTrigger>
                <TabsTrigger value="message" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Messages
                </TabsTrigger>
                <TabsTrigger value="swap" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Swaps
                </TabsTrigger>
                <TabsTrigger value="calendar" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Schedule
                </TabsTrigger>
                <TabsTrigger value="achievement" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Achievements
                </TabsTrigger>
              </TabsList>

              {["all", "message", "swap", "calendar", "achievement"].map(tabValue => (
                <TabsContent key={tabValue} value={tabValue} className="space-y-3">
                  {filterNotifications(tabValue === "all" ? undefined : tabValue).length === 0 ? (
                    <div className="text-center py-12 text-blue-400">
                      <Bell className="size-12 mx-auto mb-3 opacity-50" />
                      <p>No notifications in this category</p>
                    </div>
                  ) : (
                    filterNotifications(tabValue === "all" ? undefined : tabValue).map((notification) => {
                      const Icon = notification.icon;
                      return (
                        <div
                          key={notification.id}
                          className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                            notification.read
                              ? "bg-white border-blue-100"
                              : "bg-blue-50 border-blue-200"
                          }`}
                        >
                          <div className={`p-3 rounded-full ${getColorClasses(notification.color)}`}>
                            <Icon className="size-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h3 className="font-semibold text-blue-900">
                                  {notification.title}
                                  {!notification.read && (
                                    <span className="ml-2 inline-block size-2 bg-blue-500 rounded-full" />
                                  )}
                                </h3>
                                <p className="text-sm text-blue-600 mt-1">
                                  {notification.description}
                                </p>
                                <p className="text-xs text-blue-400 mt-2">
                                  {notification.time}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {!notification.read && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => markAsRead(notification.id)}
                                    className="size-8 text-blue-600 hover:bg-blue-100"
                                  >
                                    <CheckCheck className="size-4" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteNotification(notification.id)}
                                  className="size-8 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
