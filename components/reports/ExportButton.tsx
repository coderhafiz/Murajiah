"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  filename?: string;
}

export default function ExportButton({
  data,
  filename = "report",
}: ExportButtonProps) {
  const handleExport = () => {
    try {
      if (!data || data.length === 0) {
        toast.error("No data to export");
        return;
      }

      // 1. Flatten/Normalize Data for CSV
      // We assume data is the players array for now
      const csvRows = [];

      // Headers
      const headers = ["Rank", "Nickname", "Score", "Joined At"];
      csvRows.push(headers.join(","));

      // Rows
      data.forEach((player, index) => {
        const row = [
          index + 1,
          `"${player.nickname.replace(/"/g, '""')}"`, // Escape quotes
          player.score,
          player.joined_at ? new Date(player.joined_at).toISOString() : "",
        ];
        csvRows.push(row.join(","));
      });

      // 2. Create CSV Blob
      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

      // 3. Trigger Download
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${filename.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Export successful!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export CSV");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="gap-2"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </Button>
  );
}
