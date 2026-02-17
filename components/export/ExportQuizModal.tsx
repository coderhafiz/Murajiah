"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, Loader2, FileJson, FileText, Table } from "lucide-react";
import { toast } from "sonner";
import { getQuizForExport } from "@/app/actions/export";
import { cn } from "@/lib/utils";

interface ExportQuizModalProps {
  quizId: string;
  quizTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = "json" | "csv" | "txt";

interface ExportAnswer {
  text: string;
  is_correct: boolean;
}

interface ExportQuestion {
  question_type: string;
  title: string;
  time_limit: number;
  answers: ExportAnswer[];
}

export default function ExportQuizModal({
  quizId,
  quizTitle,
  open,
  onOpenChange,
}: ExportQuizModalProps) {
  const [format, setFormat] = useState<ExportFormat>("txt");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await getQuizForExport(quizId);

      if (!result.success || !result.quiz) {
        toast.error(result.error || "Failed to fetch quiz data");
        setLoading(false);
        return;
      }

      const { quiz } = result;
      // Cast the questions to our known type for safe access
      const questions = (quiz.questions || []) as unknown as ExportQuestion[];

      let content = "";
      let mimeType = "text/plain";
      let extension = "txt";

      if (format === "json") {
        content = JSON.stringify(quiz, null, 2);
        mimeType = "application/json";
        extension = "json";
      } else if (format === "csv") {
        // Simple CSV generation
        const headers = [
          "Question Type",
          "Question Text",
          "Time Limit (s)",
          "Answer 1",
          "Is Correct 1",
          "Answer 2",
          "Is Correct 2",
          "Answer 3",
          "Is Correct 3",
          "Answer 4",
          "Is Correct 4",
        ];

        const rows = questions.map((q) => {
          const answers = (Array.isArray(q.answers) ? q.answers : []).slice(
            0,
            4,
          );
          const rowData = [
            q.question_type,
            `"${(q.title || "").replace(/"/g, '""')}"`, // Escape quotes
            q.time_limit || 0,
            ...answers.flatMap((a) => [
              `"${(a.text || "").replace(/"/g, '""')}"`,
              a.is_correct ? "Yes" : "No",
            ]),
          ];
          return rowData.join(",");
        });

        content = [headers.join(","), ...rows].join("\n");
        mimeType = "text/csv";
        extension = "csv";
      } else {
        // TXT Format
        content = `Quiz: ${quiz.title}\n`;
        content += `Description: ${quiz.description || "N/A"}\n`;
        content += `Questions: ${questions.length || 0}\n\n`;
        content += "----------------------------------------\n\n";

        questions.forEach((q, i) => {
          content += `Q${i + 1} [${q.question_type}]: ${q.title}\n`;
          if (q.time_limit) content += `Time Limit: ${q.time_limit}s\n`;

          if (Array.isArray(q.answers)) {
            q.answers.forEach((a) => {
              const marker = a.is_correct ? "(Correct)" : "";
              content += `   - ${a.text} ${marker}\n`;
            });
          }
          content += "\n";
        });
      }

      // Trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Sanitize filename (remove characters that are invalid in filenames)
      const safeTitle = quizTitle.replace(/[/\\?%*:|"<>]/g, "-").trim();
      a.download = `${safeTitle}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export downloaded successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("An error occurred during export");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Quiz Questions</DialogTitle>
          <DialogDescription>
            Download the questions and answers for this quiz.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <RadioGroup
            value={format}
            onValueChange={(v) => setFormat(v as ExportFormat)}
            className="grid grid-cols-3 gap-4"
          >
            <div onClick={() => setFormat("txt")} className="cursor-pointer">
              <RadioGroupItem value="txt" id="txt" className="sr-only" />
              <Label
                htmlFor="txt"
                className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  format === "txt" &&
                    "border-primary bg-accent text-accent-foreground",
                )}
              >
                <FileText className="mb-3 h-6 w-6" />
                Text
              </Label>
            </div>
            <div onClick={() => setFormat("csv")} className="cursor-pointer">
              <RadioGroupItem value="csv" id="csv" className="sr-only" />
              <Label
                htmlFor="csv"
                className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  format === "csv" &&
                    "border-primary bg-accent text-accent-foreground",
                )}
              >
                <Table className="mb-3 h-6 w-6" />
                CSV
              </Label>
            </div>
            <div onClick={() => setFormat("json")} className="cursor-pointer">
              <RadioGroupItem value="json" id="json" className="sr-only" />
              <Label
                htmlFor="json"
                className={cn(
                  "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  format === "json" &&
                    "border-primary bg-accent text-accent-foreground",
                )}
              >
                <FileJson className="mb-3 h-6 w-6" />
                JSON
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
