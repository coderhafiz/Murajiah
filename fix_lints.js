const fs = require("fs");
const path = "app/(game)/host/[gameId]/HostGameController.tsx";

try {
  let content = fs.readFileSync(path, "utf8");
  let lines = content.split("\n");

  // Filter garbage lines
  lines = lines.filter(
    (line) =>
      !line.includes("// answersReceivedCount, -> remove") &&
      !line.includes("// .map((a, i) => a.id);") &&
      !line.includes("// const correctIds... -> remove") &&
      !line.includes("// const correctColors... -> remove") &&
      !line.includes("// Actually I will assume line numbers") &&
      !line.includes("// Better to do targeted single replacements"),
  );

  // Rejoin to operate on full string for replacements
  content = lines.join("\n");

  // Apply Lint Fixes via simple replacements
  content = content.replace(
    'import { User, X } from "lucide-react";',
    'import { User } from "lucide-react";',
  );

  content = content.replace(/answersReceivedCount,\s*/g, "");

  content = content.replace(
    /\(payload: any\) =>/g,
    "(payload: { payload: unknown }) =>",
  );

  content = content.replace(
    "let answersPromise: Promise<any[]>;",
    "let answersPromise: Promise<{ answer_id: string; player_id?: string }[]>;",
  );

  content = content.replace(
    "const [_, fetchedAnswers] =",
    "const [, fetchedAnswers] =",
  );

  content = content.replace(
    "let currentAnswers: { answer_id:",
    "const currentAnswers: { answer_id:",
  );

  // Remove unused vars lines by filtering again? Or replacing with empty?
  // Using direct string replacement if unique enough.
  content = content.replace(
    "const correctIds = new Set(correctAnswers.map((a) => a.id));",
    "",
  );
  content = content.replace(
    "const correctColors = new Set(correctAnswers.map((a) => a.color));",
    "",
  );

  // Error casts
  // Global replacement
  content = content
    .split("(result as any).error")
    .join("(result as { error: string }).error");

  // New Bots
  content = content.replace(
    "const newBots: any[] = [];",
    "const newBots: Player[] = [];",
  );

  fs.writeFileSync(path, content);
  console.log("Successfully fixed HostGameController.tsx");
} catch (err) {
  console.error("Error fixing file:", err);
}
