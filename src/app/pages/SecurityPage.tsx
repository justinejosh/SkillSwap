import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, Shield, Smartphone, Key, Monitor, CheckCircle2, Clock } from "lucide-react";

export default function SecurityPage() {
  const navigate = useNavigate();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loginActivity = [
    { id: 1, device: "Chrome on Windows", location: "New York, USA", time: "2 hours ago", status: "current" },
    { id: 2, device: "Safari on iPhone", location: "New York, USA", time: "1 day ago", status: "success" },
    { id: 3, device: "Firefox on Mac", location: "Boston, USA", time: "3 days ago", status: "success" },
    { id: 4, device: "Unknown Device", location: "London, UK", time: "5 days ago", status: "failed" },
  ];

  const handleChangePassword = () => {
    if (newPassword === confirmPassword) {
      alert("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      alert("Passwords do not match!");
    }
  };

  const handleEnable2FA = () => {
    setTwoFactorEnabled(!twoFactorEnabled);
    alert(twoFactorEnabled ? "2FA disabled" : "2FA enabled! (Mock)");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            className="text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="size-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="size-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-blue-900">Security Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Change Password */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="size-5 text-blue-600" />
              <CardTitle className="text-blue-900">Change Password</CardTitle>
            </div>
            <CardDescription className="text-blue-600">
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-blue-900">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-blue-900">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-blue-900">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
            <Button 
              onClick={handleChangePassword}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="size-5 text-blue-600" />
              <CardTitle className="text-blue-900">Two-Factor Authentication</CardTitle>
            </div>
            <CardDescription className="text-blue-600">
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-blue-100 bg-blue-50/30">
              <div className="space-y-1">
                <p className="font-medium text-blue-900">Enable Two-Factor Authentication</p>
                <p className="text-sm text-blue-600">
                  {twoFactorEnabled 
                    ? "2FA is currently enabled on your account" 
                    : "Protect your account with 2FA using an authenticator app"
                  }
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={handleEnable2FA}
              />
            </div>
            
            {twoFactorEnabled && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="size-5" />
                  <span className="font-medium">2FA is Active</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Your account is protected with two-factor authentication
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Login Activity */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="size-5 text-blue-600" />
              <CardTitle className="text-blue-900">Login Activity</CardTitle>
            </div>
            <CardDescription className="text-blue-600">
              Recent login attempts and active sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loginActivity.map((activity) => (
              <div 
                key={activity.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  activity.status === "current"
                    ? "border-green-200 bg-green-50/30"
                    : activity.status === "failed"
                    ? "border-red-200 bg-red-50/30"
                    : "border-blue-100 bg-blue-50/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Monitor className={`size-5 ${
                    activity.status === "current"
                      ? "text-green-600"
                      : activity.status === "failed"
                      ? "text-red-600"
                      : "text-blue-600"
                  }`} />
                  <div>
                    <p className="font-medium text-blue-900">{activity.device}</p>
                    <p className="text-sm text-blue-600">{activity.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant="secondary"
                    className={
                      activity.status === "current"
                        ? "bg-green-100 text-green-800"
                        : activity.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }
                  >
                    {activity.status === "current" ? "Active Now" : activity.status === "failed" ? "Failed" : "Success"}
                  </Badge>
                  <p className="text-xs text-blue-500 mt-1 flex items-center gap-1 justify-end">
                    <Clock className="size-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
