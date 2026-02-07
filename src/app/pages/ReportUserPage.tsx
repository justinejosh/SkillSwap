import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group";
import { Badge } from "@/app/components/ui/badge";
import { ArrowLeft, AlertTriangle, Ban, Flag, CheckCircle2 } from "lucide-react";

export default function ReportUserPage() {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState("scam");
  const [reportedUser, setReportedUser] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const myReports = [
    { id: 1, reported: "Bob Wilson", reason: "No-show", status: "pending", date: "2 days ago" },
    { id: 2, reported: "Jane Doe", reason: "Scam attempt", status: "resolved", date: "1 week ago" },
  ];

  const blockedUsers = [
    { id: 1, name: "John Scammer", blockedDate: "3 days ago" },
    { id: 2, name: "Spam Account", blockedDate: "1 week ago" },
  ];

  const handleSubmitReport = () => {
    if (!reportedUser || !description) {
      alert("Please fill in all fields");
      return;
    }
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setReportedUser("");
      setDescription("");
      setReportType("scam");
    }, 3000);
  };

  const handleBlockUser = () => {
    if (!reportedUser) {
      alert("Please enter a username to block");
      return;
    }
    alert(`User "${reportedUser}" has been blocked`);
    setReportedUser("");
  };

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
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-6 text-red-600" />
            <h1 className="text-2xl font-bold text-blue-900">Report & Block Users</h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Submit Report */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Flag className="size-5 text-red-600" />
              <CardTitle className="text-blue-900">Report a User</CardTitle>
            </div>
            <CardDescription className="text-blue-600">
              Help us maintain a safe community by reporting suspicious activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitted ? (
              <div className="p-6 rounded-lg bg-green-50 border border-green-200 text-center">
                <CheckCircle2 className="size-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-medium text-green-900 mb-1">Report Submitted Successfully</h3>
                <p className="text-sm text-green-700">
                  Our team will review your report within 24 hours
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reported-user" className="text-blue-900">Username to Report</Label>
                  <Input
                    id="reported-user"
                    placeholder="Enter username"
                    value={reportedUser}
                    onChange={(e) => setReportedUser(e.target.value)}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-blue-900">Report Reason</Label>
                  <RadioGroup value={reportType} onValueChange={setReportType}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-blue-100 hover:bg-blue-50/30">
                      <RadioGroupItem value="scam" id="scam" />
                      <Label htmlFor="scam" className="cursor-pointer flex-1">
                        Scam / Fraud Activity
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-blue-100 hover:bg-blue-50/30">
                      <RadioGroupItem value="inappropriate" id="inappropriate" />
                      <Label htmlFor="inappropriate" className="cursor-pointer flex-1">
                        Inappropriate Behavior
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-blue-100 hover:bg-blue-50/30">
                      <RadioGroupItem value="noshow" id="noshow" />
                      <Label htmlFor="noshow" className="cursor-pointer flex-1">
                        No-Show / Unreliable
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-blue-100 hover:bg-blue-50/30">
                      <RadioGroupItem value="spam" id="spam" />
                      <Label htmlFor="spam" className="cursor-pointer flex-1">
                        Spam / Harassment
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-blue-900">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Please describe what happened..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="border-blue-200 focus:border-blue-400 min-h-32"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSubmitReport}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Submit Report
                  </Button>
                  <Button 
                    onClick={handleBlockUser}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Ban className="mr-2 size-4" />
                    Block User
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Reports */}
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">My Reports</CardTitle>
              <CardDescription className="text-blue-600">
                Track your submitted reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {myReports.map((report) => (
                <div 
                  key={report.id}
                  className="p-3 rounded-lg border border-blue-100 bg-blue-50/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-blue-900">{report.reported}</p>
                    <Badge 
                      variant="secondary"
                      className={
                        report.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }
                    >
                      {report.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-600">{report.reason}</p>
                  <p className="text-xs text-blue-500 mt-1">{report.date}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Blocked Users */}
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Blocked Users</CardTitle>
              <CardDescription className="text-blue-600">
                Users you've blocked
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {blockedUsers.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-blue-100 bg-blue-50/30"
                >
                  <div>
                    <p className="font-medium text-blue-900">{user.name}</p>
                    <p className="text-xs text-blue-500">Blocked {user.blockedDate}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
