"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { createAssignment } from "@/app/actions/assignments";

interface AssignQuizModalProps {
  quizId: string;
  quizTitle: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AssignQuizModal({
  quizId,
  quizTitle,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: AssignQuizModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"settings" | "success">("settings");
  const [assignmentLink, setAssignmentLink] = useState("");

  // Form State
  // Default to 7 days from now
  const getLocalFormattedDate = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return getLocalFormattedDate(d);
  });

  const addDaysToDeadline = (days: number) => {
    let d = new Date();
    if (deadline) {
      d = new Date(deadline); // parses local if missing 'Z'
    }
    d.setDate(d.getDate() + days);
    setDeadline(getLocalFormattedDate(d));
  };
  const [timeLimit, setTimeLimit] = useState("0"); // 0 = unlimited
  const [attempts, setAttempts] = useState("1");
  const [shuffle, setShuffle] = useState(true);
  const [showResults, setShowResults] = useState(true);

  const handleCreate = async () => {
    if (!deadline) {
      toast.error("Please set a deadline");
      return;
    }

    if (new Date(deadline) < new Date()) {
      toast.error("Deadline cannot be in the past");
      return;
    }

    setLoading(true);
    try {
      const result = await createAssignment({
        quizId,
        title: quizTitle,
        deadline: new Date(deadline).toISOString(),
        settings: {
          time_per_question: parseInt(timeLimit) || undefined,
          attempts_allowed: parseInt(attempts) || 1,
          shuffle_answers: shuffle,
          show_results: showResults,
        },
      });

      if (result.success && result.assignment) {
        const link = `${window.location.origin}/assign/${result.assignment.access_token}`;
        setAssignmentLink(link);
        setStep("success");
        toast.success("Assignment created!");
      } else {
        toast.error(result.error || "Failed to create assignment");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(assignmentLink);
    toast.success("Link copied!");
  };

  const reset = () => {
    setStep("settings");
    setAssignmentLink("");
    setDeadline("");
    // Keep other strict defaults or reset them?
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) setTimeout(reset, 300);
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === "settings" ? "Assign Quiz" : "Assignment Ready"}
          </DialogTitle>
          <DialogDescription>
            {step === "settings"
              ? "Configure settings for self-paced learning."
              : "Share this link with your students."}
          </DialogDescription>
        </DialogHeader>

        {step === "settings" ? (
          <div className="space-y-6 py-4">
            {/* Deadline */}
            <div className="space-y-2">
              <Label>Deadline (Required)</Label>
              <div className="relative">
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addDaysToDeadline(-1)}
                  className="text-xs h-7"
                >
                  -1 Day
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addDaysToDeadline(1)}
                  className="text-xs h-7"
                >
                  +1 Day
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addDaysToDeadline(7)}
                  className="text-xs h-7"
                >
                  +1 Week
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Attempts */}
              <div className="space-y-2">
                <Label>Attempts Allowed</Label>
                <Select value={attempts} onValueChange={setAttempts}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Attempt</SelectItem>
                    <SelectItem value="2">2 Attempts</SelectItem>
                    <SelectItem value="3">3 Attempts</SelectItem>
                    <SelectItem value="5">5 Attempts</SelectItem>
                    <SelectItem value="100">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timer */}
              <div className="space-y-2">
                <Label>Timer per Question</Label>
                <Select value={timeLimit} onValueChange={setTimeLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Timer</SelectItem>
                    <SelectItem value="10">10 Seconds</SelectItem>
                    <SelectItem value="20">20 Seconds</SelectItem>
                    <SelectItem value="30">30 Seconds</SelectItem>
                    <SelectItem value="60">1 Minute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Shuffle Answers</Label>
                  <p className="text-xs text-muted-foreground">
                    Randomize answer order for each student
                  </p>
                </div>
                <Switch checked={shuffle} onCheckedChange={setShuffle} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Results</Label>
                  <p className="text-xs text-muted-foreground">
                    Show score and correct answers after completion
                  </p>
                </div>
                <Switch
                  checked={showResults}
                  onCheckedChange={setShowResults}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="p-4 bg-muted rounded-lg border flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600 dark:text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{quizTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  is now assigned!
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Shareable Link</Label>
              <div className="flex items-center gap-2">
                <Input value={assignmentLink} readOnly className="font-mono" />
                <Button size="icon" variant="outline" onClick={copyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "settings" ? (
            <Button
              onClick={handleCreate}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Assignment
            </Button>
          ) : (
            <Button
              onClick={() => setOpen(false)}
              variant="outline"
              className="w-full"
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
