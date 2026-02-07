import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, AlertTriangle, CheckCircle, Clock, XCircle, FileText, MessageSquare, Scale, User } from "lucide-react";

export default function DisputeResolutionPage() {
  const navigate = useNavigate();
  const [isNewDisputeOpen, setIsNewDisputeOpen] = useState(false);

  // Mock dispute data
  const disputes = [
    {
      id: 1,
      caseNumber: "DS-2026-001",
      with: "Alice Johnson",
      skill: "Python Programming",
      status: "resolved",
      reason: "Session not completed",
      openedDate: "Jan 20, 2026",
      resolvedDate: "Jan 25, 2026",
      outcome: "Refund issued - both parties compensated",
      priority: "medium",
    },
    {
      id: 2,
      caseNumber: "DS-2026-002",
      with: "Bob Williams",
      skill: "Guitar Lessons",
      status: "in-progress",
      reason: "Quality concerns",
      openedDate: "Jan 28, 2026",
      priority: "high",
      mediator: "Admin Team",
      lastUpdate: "2 hours ago",
    },
    {
      id: 3,
      caseNumber: "DS-2026-003",
      with: "Carol Davis",
      skill: "Web Design",
      status: "pending",
      reason: "Scheduling conflict",
      openedDate: "Jan 29, 2026",
      priority: "low",
    },
  ];

  const disputeTypes = [
    { value: "no-show", label: "No-show / Session not completed" },
    { value: "quality", label: "Quality of teaching concerns" },
    { value: "behavior", label: "Inappropriate behavior" },
    { value: "scheduling", label: "Scheduling conflicts" },
    { value: "skill-mismatch", label: "Skill level mismatch" },
    { value: "other", label: "Other issues" },
  ];

  const resolutionProcess = [
    {
      step: 1,
      title: "File Dispute",
      description: "Submit your complaint with detailed evidence",
      icon: FileText,
    },
    {
      step: 2,
      title: "Review",
      description: "Admin team reviews within 24 hours",
      icon: Clock,
    },
    {
      step: 3,
      title: "Mediation",
      description: "Both parties discuss with mediator",
      icon: MessageSquare,
    },
    {
      step: 4,
      title: "Resolution",
      description: "Fair outcome implemented",
      icon: Scale,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="mr-1 size-3" />
            Resolved
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-blue-500 text-white">
            <Clock className="mr-1 size-3" />
            In Progress
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500 text-white">
            <AlertTriangle className="mr-1 size-3" />
            Pending Review
          </Badge>
        );
      case "closed":
        return (
          <Badge className="bg-gray-500 text-white">
            <XCircle className="mr-1 size-3" />
            Closed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
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
              <Scale className="size-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-900">Dispute Resolution Center</h1>
            </div>
          </div>
          <Dialog open={isNewDisputeOpen} onOpenChange={setIsNewDisputeOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <AlertTriangle className="mr-2 size-4" />
                File New Dispute
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>File a Dispute</DialogTitle>
                <DialogDescription>
                  Provide details about your concern. Our team will review within 24 hours.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4 mt-4" onSubmit={(e) => { e.preventDefault(); alert("Dispute submitted!"); setIsNewDisputeOpen(false); }}>
                <div className="space-y-2">
                  <Label htmlFor="swap-partner">Swap Partner</Label>
                  <Input
                    id="swap-partner"
                    placeholder="Enter name or select from recent swaps"
                    className="border-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skill">Skill Involved</Label>
                  <Input
                    id="skill"
                    placeholder="e.g., Python Programming"
                    className="border-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dispute-type">Dispute Type</Label>
                  <Select>
                    <SelectTrigger className="border-blue-200">
                      <SelectValue placeholder="Select dispute type" />
                    </SelectTrigger>
                    <SelectContent>
                      {disputeTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Explain what happened in detail. Include dates, times, and any relevant information..."
                    rows={5}
                    className="border-blue-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evidence">Supporting Evidence (Optional)</Label>
                  <Input
                    id="evidence"
                    type="file"
                    multiple
                    className="border-blue-200"
                  />
                  <p className="text-xs text-blue-400">Screenshots, messages, or other relevant files</p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    Submit Dispute
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewDisputeOpen(false)}
                    className="border-blue-200 text-blue-600"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Resolution Process */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">How Dispute Resolution Works</CardTitle>
            <CardDescription className="text-blue-600">
              Our fair and transparent process ensures both parties are heard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {resolutionProcess.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.step} className="relative">
                    <div className="flex flex-col items-center text-center">
                      <div className="p-4 bg-blue-100 rounded-full mb-3">
                        <Icon className="size-6 text-blue-600" />
                      </div>
                      <div className="absolute top-8 left-1/2 w-full h-0.5 bg-blue-200 -z-10" style={{ display: index === 3 ? 'none' : 'block' }} />
                      <div className="bg-blue-600 text-white rounded-full size-8 flex items-center justify-center font-bold mb-2">
                        {step.step}
                      </div>
                      <h4 className="font-semibold text-blue-900">{step.title}</h4>
                      <p className="text-sm text-blue-600 mt-1">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Disputes List */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">My Disputes</CardTitle>
            <CardDescription className="text-blue-600">
              Track and manage your dispute cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="grid grid-cols-4 w-full bg-blue-50">
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  All Cases
                </TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Pending
                </TabsTrigger>
                <TabsTrigger value="in-progress" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  In Progress
                </TabsTrigger>
                <TabsTrigger value="resolved" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                  Resolved
                </TabsTrigger>
              </TabsList>

              {["all", "pending", "in-progress", "resolved"].map((tabValue) => (
                <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                  {disputes
                    .filter((d) => tabValue === "all" || d.status === tabValue)
                    .map((dispute) => (
                      <div
                        key={dispute.id}
                        className={`p-4 rounded-lg border ${getPriorityColor(dispute.priority)}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-full">
                              <User className="size-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-blue-900">
                                Case: {dispute.caseNumber}
                              </h3>
                              <p className="text-sm text-blue-600">
                                Dispute with {dispute.with} • {dispute.skill}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(dispute.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-blue-500">Reason</p>
                            <p className="text-sm font-medium text-blue-900">{dispute.reason}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-500">Priority</p>
                            <p className="text-sm font-medium text-blue-900 capitalize">{dispute.priority}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-500">Opened</p>
                            <p className="text-sm font-medium text-blue-900">{dispute.openedDate}</p>
                          </div>
                          {dispute.resolvedDate && (
                            <div>
                              <p className="text-xs text-blue-500">Resolved</p>
                              <p className="text-sm font-medium text-blue-900">{dispute.resolvedDate}</p>
                            </div>
                          )}
                        </div>

                        {dispute.status === "in-progress" && dispute.mediator && (
                          <div className="bg-blue-100 p-3 rounded-lg mb-3">
                            <p className="text-sm text-blue-700">
                              <strong>Mediator:</strong> {dispute.mediator}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Last update: {dispute.lastUpdate}
                            </p>
                          </div>
                        )}

                        {dispute.status === "resolved" && dispute.outcome && (
                          <div className="bg-green-100 p-3 rounded-lg mb-3">
                            <p className="text-sm text-green-700">
                              <strong>Outcome:</strong> {dispute.outcome}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/dispute/${dispute.id}`)}
                            className="border-blue-200 text-blue-600"
                          >
                            View Details
                          </Button>
                          {dispute.status === "in-progress" && (
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => alert("Opening chat with mediator...")}
                            >
                              <MessageSquare className="mr-1 size-3" />
                              Message Mediator
                            </Button>
                          )}
                          {dispute.status === "resolved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => alert("Feedback submitted!")}
                              className="border-green-200 text-green-600"
                            >
                              <CheckCircle className="mr-1 size-3" />
                              Provide Feedback
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card className="bg-white/90 backdrop-blur border-blue-100">
          <CardHeader>
            <CardTitle className="text-blue-900">Need Help?</CardTitle>
            <CardDescription className="text-blue-600">
              Our support team is here to assist you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-semibold text-blue-900">Community Guidelines</h4>
                <p className="text-sm text-blue-600">Learn about expected behavior and policies</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/privacy")}
                className="border-blue-200 text-blue-600"
              >
                Read Guidelines
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-semibold text-blue-900">Contact Support</h4>
                <p className="text-sm text-blue-600">Speak directly with our support team</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => alert("Opening support chat...")}
                className="border-blue-200 text-blue-600"
              >
                Contact Us
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
