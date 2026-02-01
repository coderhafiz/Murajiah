const fs = require("fs");
const path = "app/(game)/host/[gameId]/HostGameController.tsx";

try {
  let content = fs.readFileSync(path, "utf8");
  const lines = content.split("\n");
  const cleanLines = lines.filter(
    (line) =>
      !line.includes("waiting for view") &&
      !line.includes("I will apply based on") &&
      !line.includes("I will rely on") &&
      !line.includes("Chunk 1: Remove X") &&
      !line.includes("Chunk 2: Fix any") &&
      !line.includes("Chunk 3: Fix puzzle") &&
      !line.includes('import { User, X } from "lucide-react"; ->'),
  );

  // Also fix the import while we are here
  const finalLines = cleanLines.map((line) => {
    if (line.includes('import { User, X } from "lucide-react";')) {
      return 'import { User } from "lucide-react";';
    }
    return line;
  });

  fs.writeFileSync(path, finalLines.join("\n"));
  console.log("Successfully cleaned HostGameController.tsx");
} catch (err) {
  console.error("Error fixing file:", err);
}
