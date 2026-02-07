import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { ArrowLeft, CheckCircle, XCircle, Clock, Upload, Award, FileCheck, Shield, Star, AlertCircle } from "lucide-react";

export default function SkillVerificationPage() {
  const navigate = useNavigate();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  // Mock data for user skills
  const mySkills = [
    {
      id: 1,
      name: "Web Development",
      status: "verified",
      verifiedDate: "Jan 15, 2026",
      method: "Portfolio Review",
      score: 95,
    },
    {
      id: 2,
      name: "Graphic Design",
      status: "verified",
      verifiedDate: "Jan 10, 2026",
      method: "Skills Assessment",
      score: 88,
    },
    {
      id: 3,
      name: "Photography",
      status: "pending",
      submittedDate: "Jan 28, 2026",
      method: "Portfolio Review",
    },
    {
      id: 4,
      name: "Spanish Language",
      status: "unverified",
    },
    {
      id: 5,
      name: "Piano",
      status: "unverified",
    },
  ];

  const verificationMethods = [
    {
      id: 1,
      name: "Skills Assessment",
      description: "Complete a comprehensive quiz to demonstrate your knowledge",
      duration: "20-30 minutes",
      icon: FileCheck,
      difficulty: "Medium",
    },
    {
      id: 2,
      name: "Portfolio Review",
      description: "Submit your portfolio or work samples for expert evaluation",
      duration: "2-3 days review",
      icon: Upload,
      difficulty: "Easy",
    },
    {
      id: 3,
      name: "Certificate Upload",
      description: "Upload official certificates or credentials from recognized institutions",
      duration: "1-2 days verification",
      icon: Award,
      difficulty: "Easy",
    },
    {
      id: 4,
      name: "Peer Endorsement",
      description: "Get endorsed by verified users who can vouch for your skills",
      duration: "Varies",
      icon: Shield,
      difficulty: "Medium",
    },
  ];

  const benefits = [
    "40% higher match rate with verified users",
    "Priority placement in search results",
    "Trust badge on your profile",
    "Access to premium skill swap opportunities",
    "Increased credibility and reputation",
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="mr-1 size-3" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="mr-1 size-3" />
            Pending Review
          </Badge>
        );
      case "unverified":
        return (
          <Badge className="bg-gray-300 text-gray-700">
            <XCircle className="mr-1 size-3" />
            Not Verified
          </Badge>
        );
      default:
        return null;
    }
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
          <div className="flex items-center gap-3">
            <Shield className="size-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-blue-900">Skill Verification</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Benefits Banner */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 text-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-full">
                <Star className="size-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2">Why Verify Your Skills?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="size-4 flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Skills - Verification Status */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-white/90 backdrop-blur border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-900">My Skills Verification Status</CardTitle>
                <CardDescription className="text-blue-600">
                  Track the verification status of your skills
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mySkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-blue-900">{skill.name}</h3>
                        {getStatusBadge(skill.status)}
                      </div>
                      {skill.status === "verified" && (
                        <div className="mt-2 text-sm text-blue-600">
                          <p>Verified on {skill.verifiedDate} via {skill.method}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-32 bg-blue-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${skill.score}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold">Score: {skill.score}/100</span>
                          </div>
                        </div>
                      )}
                      {skill.status === "pending" && (
                        <p className="mt-2 text-sm text-blue-600">
                          Submitted on {skill.submittedDate} • Review in progress
                        </p>
                      )}
                      {skill.status === "unverified" && (
                        <p className="mt-2 text-sm text-blue-400">
                          Start verification to boost your credibility
                        </p>
                      )}
                    </div>
                    <div>
                      {skill.status === "verified" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alert("Certificate downloaded!")}
                          className="border-green-200 text-green-600"
                        >
                          Download Certificate
                        </Button>
                      )}
                      {skill.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="border-yellow-200 text-yellow-600"
                        >
                          In Review
                        </Button>
                      )}
                      {skill.status === "unverified" && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => setSelectedSkill(skill.name)}
                            >
                              Start Verification
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Verify {selectedSkill}</DialogTitle>
                              <DialogDescription>
                                Choose a verification method to get your skill validated
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              {verificationMethods.map((method) => {
                                const Icon = method.icon;
                                return (
                                  <div
                                    key={method.id}
                                    className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all cursor-pointer"
                                    onClick={() => {
                                      alert(`Starting ${method.name} verification for ${selectedSkill}`);
                                    }}
                                  >
                                    <div className="flex items-start gap-4">
                                      <div className="p-3 bg-blue-100 rounded-full">
                                        <Icon className="size-5 text-blue-600" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-semibold text-blue-900">{method.name}</h4>
                                          <Badge className="bg-blue-100 text-blue-900">
                                            {method.difficulty}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-blue-600 mt-1">{method.description}</p>
                                        <p className="text-xs text-blue-400 mt-2">
                                          ⏱️ {method.duration}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Verification Methods & Stats */}
          <div className="space-y-4">
            <Card className="bg-white/90 backdrop-blur border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-900">Verification Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-4xl font-bold text-blue-900">2/5</div>
                  <p className="text-sm text-blue-600 mt-1">Skills Verified</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-4xl font-bold text-green-900">40%</div>
                  <p className="text-sm text-green-600 mt-1">Verification Rate</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600">Profile Strength</span>
                    <span className="text-blue-900 font-semibold">65%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: "65%" }} />
                  </div>
                  <p className="text-xs text-blue-400">
                    Verify 2 more skills to reach 100%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <AlertCircle className="size-5" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-blue-600">
                  <li>• Start with your strongest skills first</li>
                  <li>• Portfolio reviews are fastest for creative skills</li>
                  <li>• Certificates provide instant verification</li>
                  <li>• Assessment tests are most thorough</li>
                  <li>• Peer endorsements build community trust</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
