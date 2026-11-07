import { api } from "@/app/lib/api";
import GoogleSignIn from "@/app/components/GoogleSignIn";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { API_BASE_URL } from "@/config";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleOnboarding, setGoogleOnboarding] = useState(false);
  const [notice, setNotice] = useState("");
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState<boolean | null>(
    null,
  );
  const signInForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    let active = true;
    api<{ emailDeliveryAvailable: boolean }>("/auth/recovery-options")
      .then((result) => {
        if (active) setDeliveryAvailable(result.emailDeliveryAvailable);
      })
      .catch(() => {
        /* Individual actions still show request failures. */
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "bypass-tunnel-reminder": "true",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to login. Please try again.");
      }

      // Save the token for API authorization
      localStorage.setItem("knoxite_token", data.token);

      // SAVE USER DATA: includes 'role' from backend response
      localStorage.setItem("knoxite_user", JSON.stringify(data.user));

      // Read ONLY this specific user's saved theme preference
      const userTheme = localStorage.getItem(`theme_${data.user.id}`);
      if (userTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      // Role-based routing redirect
      if (data.user?.role === "ADMIN") {
        navigate("/admin-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-blue-100 bg-white/90 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl text-blue-900 font-bold">
              Knoxite
            </CardTitle>
            <CardDescription className="text-blue-600">
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleSignIn onOnboardingChange={setGoogleOnboarding} />
            {!googleOnboarding && (
              <form
                ref={signInForm}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {error && (
                  <div
                    role="alert"
                    className="p-3 text-xs md:text-sm text-red-600 bg-red-50 border border-red-200 rounded-md text-center"
                  >
                    {error}
                  </div>
                )}
                {notice && (
                  <p
                    role="status"
                    className="p-3 text-sm text-blue-900 bg-blue-50 rounded-md"
                  >
                    {notice}
                  </p>
                )}
                {deliveryAvailable === false && (
                  <p className="p-3 text-sm text-amber-900 bg-amber-50 rounded-md">
                    Email delivery is unavailable. Verification links and
                    emailed password resets cannot be sent. Contact your Knoxite
                    administrator for help.
                  </p>
                )}
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-blue-900 font-semibold"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-blue-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-blue-900 font-semibold"
                    >
                      Password
                    </Label>
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      onClick={() =>
                        navigate("/recover-account", { state: { email } })
                      }
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="........"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-blue-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 py-6 text-lg font-bold transition-all active:scale-[0.98] mt-2"
                >
                  {isLoading ? "Authenticating..." : "Sign in"}
                </Button>
              </form>
            )}
            {!googleOnboarding && (
              <button
                type="button"
                className="mt-4 text-sm text-blue-700 underline"
                disabled={verificationBusy || deliveryAvailable === false}
                onClick={async () => {
                  const input = signInForm.current?.elements.namedItem(
                    "email",
                  ) as HTMLInputElement | null;
                  if (!input?.reportValidity()) return;
                  setError("");
                  setNotice("");
                  setVerificationBusy(true);
                  try {
                    const result = await api("/auth/request-verification", {
                      method: "POST",
                      body: JSON.stringify({ email }),
                    });
                    setNotice(result.message);
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setVerificationBusy(false);
                  }
                }}
              >
                {verificationBusy
                  ? "Requesting verification..."
                  : "Request institutional email verification"}
              </button>
            )}
            <div className="mt-8 pt-6 border-t border-blue-50 text-center text-sm text-blue-700">
              Don't have an account?{" "}
              <button
                className="text-blue-600 font-bold hover:underline decoration-2 underline-offset-4"
                onClick={() => navigate("/signup")}
              >
                Sign up
              </button>
              <p className="mt-4">
                <button
                  onClick={() => navigate("/")}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Back to Home
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
        <p className="mt-8 text-center text-[10px] text-blue-400 uppercase tracking-widest font-medium">
          Knoxite v1.0
        </p>
      </div>
    </div>
  );
}
