import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { api } from "@/app/lib/api";
export function AssessmentPrompt({
  offeringId,
  level,
  onClose,
}: {
  offeringId: string;
  level: "BASIC" | "ADVANCED";
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function dismiss() {
    setBusy(true);
    setError("");
    try {
      await api(`/profile/skills/offer/${offeringId}/prompts`, {
        method: "PATCH",
        body: JSON.stringify({ level }),
      });
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    if (!busy) level === "BASIC" ? setConfirmSkip(true) : void dismiss();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {confirmSkip
              ? "Skip the basic assessment?"
              : level === "BASIC"
                ? "Your teaching skill is saved"
                : "Amateur badge earned"}
          </DialogTitle>
          <DialogDescription>
            {confirmSkip
              ? 'Your skill will remain marked "Not Assessed". You can continue teaching, matching, and swapping. Take the assessment later from My Skills.'
              : level === "BASIC"
                ? "Would you like to take a basic assessment to earn the Amateur badge?"
                : "Congratulations! You've earned the Amateur badge. You can now take the advanced assessment to earn Verified status."}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {confirmSkip ? (
            <>
              <Button disabled={busy} onClick={() => void dismiss()}>
                Confirm Skip
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => setConfirmSkip(false)}
              >
                Go Back
              </Button>
            </>
          ) : (
            <>
              <Button
                disabled={busy}
                onClick={() => {
                  onClose();
                  navigate(`/assessments/offerings/${offeringId}`);
                }}
              >
                {level === "BASIC"
                  ? "Take Basic Assessment"
                  : "Take Advanced Assessment"}
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() =>
                  level === "BASIC" ? setConfirmSkip(true) : void dismiss()
                }
              >
                {level === "BASIC" ? "Skip for Now" : "Maybe Later"}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
