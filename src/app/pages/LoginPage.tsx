import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Star } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login attempt with:", { email, password });
    // Navigate to dashboard after successful login
    navigate("/dashboard");
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
        {/* Login Card */}
        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border-blue-100 bg-white/90 backdrop-blur">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center text-blue-900">Welcome back</CardTitle>
              <CardDescription className="text-center text-blue-600">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-blue-900">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-blue-900">Password</Label>
                    <a
                      href="#"
                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Password reset feature");
                      }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Sign in
                </Button>
              </form>
              <div className="mt-4 text-center text-sm text-blue-700">
                Don't have an account?{" "}
                <a
                  href="/signup"
                  className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/signup");
                  }}
                >
                  Sign up
                </a>
              </div>
              <div className="mt-2 text-center text-xs text-blue-600">
                <a
                  href="/privacy"
                  className="hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/privacy");
                  }}
                >
                  Privacy Policy & Security
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Reviews Section - Horizontal */}
        <Card className="shadow-lg border-blue-100 bg-white/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-center text-blue-900">What our users say</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviews.map((review, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="size-4 fill-blue-500 text-blue-500" />
                    ))}
                  </div>
                  <p className="text-sm text-blue-800 italic">"{review.comment}"</p>
                  <div className="text-xs text-blue-600">
                    <span className="font-medium">{review.name}</span>
                    <br />
                    {review.role}
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