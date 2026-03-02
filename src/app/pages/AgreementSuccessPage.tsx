import { useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { CheckCircle2, Calendar, MessageCircle, ArrowRight } from "lucide-react";

export default function AgreementSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur shadow-2xl rounded-3xl overflow-hidden border-none animate-in fade-in zoom-in duration-500">
        <CardContent className="pt-12 pb-8 px-8 text-center space-y-6">
          {/* Animated Icon Header */}
          <div className="flex justify-center">
            <div className="bg-green-100 p-4 rounded-full animate-bounce">
              <CheckCircle2 className="size-12 text-green-600" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-blue-900 leading-tight">It's Official!</h1>
            <p className="text-blue-600 font-medium">Your skill swap agreement has been signed and secured.</p>
          </div>

          {/* Next Steps Guide */}
          <div className="bg-blue-50/50 rounded-2xl p-4 text-left border border-blue-100 space-y-4">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest ml-1">What's Next?</h3>
            
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
                <MessageCircle className="size-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Coordinate</p>
                <p className="text-xs text-blue-600">Message your partner to set your first session date.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
                <Calendar className="size-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Track Progress</p>
                <p className="text-xs text-blue-600">Use your dashboard to log completed hours.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <Button 
              onClick={() => navigate("/dashboard")}
              className="w-full bg-blue-600 hover:bg-blue-700 h-14 rounded-2xl text-lg font-bold shadow-lg shadow-blue-200 group"
            >
              Back to Dashboard
              <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <p className="text-[10px] text-blue-300 uppercase font-medium">
              Agreement ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}