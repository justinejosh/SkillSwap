import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Star } from "lucide-react";
// 1. IMPORT YOUR CONFIG
import { API_BASE_URL } from "@/config";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); 
    setIsLoading(true);

    try {
      // 2. USE API_BASE_URL instead of hardcoded IP
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true" // Added for smooth mobile/tunnel access
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to login. Please try again.");
      }

      localStorage.setItem("knoxite_token", data.token);
      localStorage.setItem("knoxite_user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const reviews = [
    {
      name: "Sarah Johnson",
      role: "Marketing Director",
      rating: 5,
      comment: "This platform has transformed how we manage our projects. Highly recommended!"
    },
    {
      name: "Michael Chen",
      role: "Startup Founder",
      rating: 5,
      comment: "Intuitive, powerful, and reliable. Everything we needed in one place."
    },
    {
      name: "Emily Rodriguez",
      role: "Product Manager",
      rating: 5,
      comment: "The best investment we've made for our team's productivity."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div className="w-full max-w-4xl space-y-6">
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border-blue-100 bg-white/90 backdrop-blur">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl text-blue-900 font-bold">Knoxite</CardTitle>
              <CardDescription className="text-blue-600">
                Sign in to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {error && (
                  <div className="p-3 text-xs md:text-sm text-red-600 bg-red-50 border border-red-200 rounded-md text-center">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-blue-900">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-blue-900">Password</Label>
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => alert("Password reset coming soon!")}
                    >
                      Forgot?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 py-6 text-lg font-semibold"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>

              </form>
              <div className="mt-6 text-center text-sm text-blue-700">
                Don't have an account?{" "}
                <button
                  className="text-blue-600 font-bold hover:underline"
                  onClick={() => navigate("/signup")}
                >
                  Sign up
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Reviews Section - Hidden on small mobile to save space, visible on MD+ */}
        <Card className="shadow-lg border-blue-100 bg-white/80 backdrop-blur hidden md:block">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-center text-blue-900">Community Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((review, index) => (
                <div key={index} className="space-y-2 border-r last:border-0 border-blue-50 pr-4">
                  <div className="flex items-center gap-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="size-3 fill-blue-500 text-blue-500" />
                    ))}
                  </div>
                  <p className="text-xs text-blue-800 italic">"{review.comment}"</p>
                  <div className="text-[10px] text-blue-600">
                    <span className="font-bold">{review.name}</span> • {review.role}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}