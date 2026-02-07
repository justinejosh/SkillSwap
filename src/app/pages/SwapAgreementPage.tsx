import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

export default function SwapAgreementPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [agreement, setAgreement] = useState({
    skillA: "Piano Lessons",
    skillB: "Photoshop Tutorials",
    duration: "1",
    sessions: "4",
    agreedToTerms: false,
  });

  const handleSubmit = () => {
    if (!agreement.agreedToTerms) {
      alert("Please agree to the terms and conditions");
      return;
    }
    alert("Swap agreement created successfully!");
    navigate("/dashboard");
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
          <h1 className="text-2xl font-bold text-blue-900">Create Swap Agreement</h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`size-10 rounded-full flex items-center justify-center font-medium ${
                  s <= step
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-400"
                }`}
              >
                {s < step ? <CheckCircle2 className="size-6" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 ${
                    s < step ? "bg-blue-600" : "bg-blue-100"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Participants */}
        {step === 1 && (
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Swap Participants</CardTitle>
              <CardDescription className="text-blue-600">
                Confirm who will be participating in this skill swap
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border border-blue-100 bg-blue-50/50">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=You" />
                    <AvatarFallback className="bg-blue-200 text-blue-900">ME</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-blue-900">You</h3>
                    <p className="text-sm text-blue-600">john.doe@example.com</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="size-8 text-blue-600" />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-blue-100 bg-blue-50/50">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=AliceJohnson" />
                    <AvatarFallback className="bg-blue-200 text-blue-900">AJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-blue-900">Alice Johnson</h3>
                    <p className="text-sm text-blue-600">alice.j@example.com</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Skills & Details */}
        {step === 2 && (
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Swap Details</CardTitle>
              <CardDescription className="text-blue-600">
                Define what skills will be exchanged and the duration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="skillA" className="text-blue-900">You Will Teach</Label>
                  <Input
                    id="skillA"
                    value={agreement.skillA}
                    onChange={(e) => setAgreement({ ...agreement, skillA: e.target.value })}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skillB" className="text-blue-900">You Will Learn</Label>
                  <Input
                    id="skillB"
                    value={agreement.skillB}
                    onChange={(e) => setAgreement({ ...agreement, skillB: e.target.value })}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-blue-900">Session Duration (hours)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={agreement.duration}
                    onChange={(e) => setAgreement({ ...agreement, duration: e.target.value })}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessions" className="text-blue-900">Number of Sessions</Label>
                  <Input
                    id="sessions"
                    type="number"
                    value={agreement.sessions}
                    onChange={(e) => setAgreement({ ...agreement, sessions: e.target.value })}
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Agreement Summary</h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• {agreement.sessions} sessions of {agreement.duration} hour(s) each</li>
                  <li>• Total commitment: {Number(agreement.sessions) * Number(agreement.duration)} hours per person</li>
                  <li>• Exchange: {agreement.skillA} ↔ {agreement.skillB}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Terms & Confirmation */}
        {step === 3 && (
          <Card className="bg-white/90 backdrop-blur border-blue-100">
            <CardHeader>
              <CardTitle className="text-blue-900">Terms & Conditions</CardTitle>
              <CardDescription className="text-blue-600">
                Review and accept the mutual learning agreement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50 max-h-60 overflow-y-auto">
                <h4 className="font-medium text-blue-900 mb-3">Mutual Learning Agreement Protocol</h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <p>1. <strong>Commitment:</strong> Both parties agree to dedicate the specified time and effort to the skill exchange.</p>
                  <p>2. <strong>Respect:</strong> Maintain professionalism and respect during all interactions.</p>
                  <p>3. <strong>Quality:</strong> Provide high-quality instruction and remain engaged throughout sessions.</p>
                  <p>4. <strong>Scheduling:</strong> Honor scheduled sessions and provide advance notice if rescheduling is needed.</p>
                  <p>5. <strong>Feedback:</strong> Provide constructive feedback and ratings after completion.</p>
                  <p>6. <strong>Privacy:</strong> Respect each other's privacy and confidentiality.</p>
                  <p>7. <strong>Cancellation:</strong> Either party may cancel with valid reason, but must communicate clearly.</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreement.agreedToTerms}
                  onCheckedChange={(checked) =>
                    setAgreement({ ...agreement, agreedToTerms: checked as boolean })
                  }
                />
                <label htmlFor="terms" className="text-sm text-blue-900 cursor-pointer">
                  I agree to the terms and conditions of this mutual learning agreement
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="border-blue-300 text-blue-600"
            >
              <ArrowLeft className="mr-2 size-4" />
              Previous
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="ml-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next
              <ArrowRight className="ml-2 size-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!agreement.agreedToTerms}
              className="ml-auto bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              Create Agreement
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
