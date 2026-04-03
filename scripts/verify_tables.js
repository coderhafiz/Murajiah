import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually load env vars
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf8");
    const env = {};
    envContent.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join("=").trim().replace(/^"|"$/g, "");
        if (key && !key.startsWith("#")) {
          env[key] = val;
        }
      }
    });
    return env;
  } catch (e) {
    console.error("Could not read .env.local", e);
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

console.log("Connecting to:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log("Checking 'assignments' table...");
  const { data: assignments, error: err1 } = await supabase
    .from("assignments")
    .select("count", { count: "exact", head: true });

  if (err1) {
    console.error(
      "FAILED to access 'assignments':",
      JSON.stringify(err1, null, 2),
    );
  } else {
    console.log(
      "SUCCESS: 'assignments' table handles request. Count:",
      assignments,
    );
  }

  console.log("Checking 'assignment_attempts' table...");
  const { data: attempts, error: err2 } = await supabase
    .from("assignment_attempts")
    .select("count", { count: "exact", head: true });

  if (err2) {
    console.error(
      "FAILED to access 'assignment_attempts':",
      JSON.stringify(err2, null, 2),
    );
  } else {
    console.log(
      "SUCCESS: 'assignment_attempts' table handles request. Count:",
      attempts,
    );
  }

  // Check relationship logic from the failing page
  console.log("Checking assignments with relations...");
  // Note: We cannot rely on user.id here easily without a token, so we'll just query generally if using service role,
  // or if anon, we might get empty results due to RLS, but NOT an error if table exists.
  // The error reported was "Error fetching assignments", which implies the query itself failed (e.g. 400 Bad Request if relation missing).

  const { error } = await supabase
    .from("assignments")
    .select(
      `
      id,
      quiz:quizzes (id, title),
      assignment_attempts (count)
    `,
    )
    .limit(1);

  if (error) {
    console.error("Relation query FAILED:", JSON.stringify(error, null, 2));
    console.log(
      "Hint: This often means foreign keys are missing or named differently.",
    );
  } else {
    console.log("Relation query SUCCESS.");
  }
}

checkTables();
