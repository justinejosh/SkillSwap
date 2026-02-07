import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { ArrowLeft, Send } from "lucide-react";

interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

interface Conversation {
  id: number;
  user: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<number>(1);
  const [messageInput, setMessageInput] = useState("");

  // Mock conversations
  const conversations: Conversation[] = [
    {
      id: 1,
      user: "Alice Johnson",
      avatar: "AJ",
      lastMessage: "Great! When can we start the Photoshop lessons?",
      timestamp: "5 min ago",
      unread: 2,
    },
    {
      id: 2,
      user: "Bob Williams",
      avatar: "BW",
      lastMessage: "Thanks for the Python tips!",
      timestamp: "1 hour ago",
      unread: 0,
    },
    {
      id: 3,
      user: "Carol Davis",
      avatar: "CD",
      lastMessage: "I'm available this weekend",
      timestamp: "Yesterday",
      unread: 1,
    },
  ];

  // Mock messages for selected chat
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "Alice Johnson",
      content: "Hi! I saw you're offering Piano lessons. I'd love to swap for Photoshop!",
      timestamp: "10:30 AM",
      isOwn: false,
    },
    {
      id: 2,
      sender: "You",
      content: "Hey Alice! That sounds perfect. I've been wanting to learn Photoshop for a while.",
      timestamp: "10:32 AM",
      isOwn: true,
    },
    {
      id: 3,
      sender: "Alice Johnson",
      content: "Great! When can we start the Photoshop lessons?",
      timestamp: "10:35 AM",
      isOwn: false,
    },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      sender: "You",
      content: messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };

    setMessages([...messages, newMessage]);
    setMessageInput("");
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex flex-col">
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
          <h1 className="text-2xl font-bold text-blue-900">Messages</h1>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Conversations List */}
          <Card className="col-span-12 md:col-span-4 bg-white/90 backdrop-blur border-blue-100 flex flex-col">
            <CardHeader>
              <CardTitle className="text-blue-900">Conversations</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                <div className="space-y-2 p-4">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedChat(conv.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedChat === conv.id
                          ? "bg-blue-100 border-blue-300"
                          : "hover:bg-blue-50 border-transparent"
                      } border`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.user}`} />
                          <AvatarFallback className="bg-blue-200 text-blue-900">
                            {conv.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-blue-900 truncate">{conv.user}</h3>
                            <span className="text-xs text-blue-500 whitespace-nowrap ml-2">
                              {conv.timestamp}
                            </span>
                          </div>
                          <p className="text-sm text-blue-600 truncate">{conv.lastMessage}</p>
                          {conv.unread > 0 && (
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-600 text-white rounded-full">
                              {conv.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="col-span-12 md:col-span-8 bg-white/90 backdrop-blur border-blue-100 flex flex-col">
            <CardHeader className="border-b border-blue-100">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=AliceJohnson" />
                  <AvatarFallback className="bg-blue-200 text-blue-900">AJ</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-blue-900">Alice Johnson</CardTitle>
                  <p className="text-sm text-blue-600">Swap: Piano ↔ Photoshop</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.isOwn
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <span
                          className={`text-xs mt-1 block ${
                            message.isOwn ? "text-blue-100" : "text-blue-500"
                          }`}
                        >
                          {message.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t border-blue-100 p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border-blue-200 focus:border-blue-400"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Send className="size-5" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
