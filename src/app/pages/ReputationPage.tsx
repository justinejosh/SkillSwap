import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Textarea } from "@/app/components/ui/textarea";
import { Star, Send, ArrowLeft } from "lucide-react";
import { API_BASE_URL } from "@/config";

export default function ReputationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const partnerId = searchParams.get("partnerId");
  const swapId = searchParams.get("swapId");

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return alert("Please select a star rating.");
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("knoxite_token");
      const res = await fetch(`${API_BASE_URL}/reputation/submit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ swapId, partnerId, rating, comment })
      });

      if (res.ok) {
        alert("Evaluation submitted! Your peer's reputation has been updated.");
        navigate("/dashboard");
      }
    } catch (error) {
      alert("Error submitting review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-2xl border-blue-100">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-black text-blue-900 tracking-tight">PEER EVALUATION</CardTitle>
          <p className="text-sm text-blue-500 font-medium">Rate your experience with your partner</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Star Rating System */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star 
                  className={`size-10 ${
                    star <= (hover || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"
                  } transition-colors`} 
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Feedback Comment</label>
            <Textarea 
              placeholder="How was the teaching quality? Did they follow the schedule?"
              className="min-h-[120px] rounded-xl border-blue-100 focus:ring-blue-600"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button 
              className="flex-[2] bg-blue-600 hover:bg-blue-700 h-12 rounded-xl font-bold"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : <><Send className="mr-2 size-4" /> Submit Review</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}