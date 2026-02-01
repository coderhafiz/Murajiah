const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log("Checking schema...");

  const { data: questionCols, error: qError } = await supabase
    .rpc("get_columns", { table_name: "questions" })
    .catch(async () => {
      // Fallback if RPC doesn't exist (likely), try selecting one row and checking keys?
      // Or just try inserting a dummy to see error?
      // Actually, we can just try to SELECT the specific columns from a real table
      return await supabase
        .from("questions")
        .select("question_type, media_url")
        .limit(1);
    });

  if (qError) {
    console.log("Questions Table Issue:", qError.message);
  } else {
    console.log("Questions Table seems to have columns (select worked).");
  }

  const { data: answerCols, error: aError } = await supabase
    .from("answers")
    .select("order_index")
    .limit(1);

  if (aError) {
    console.log("Answers Table Issue:", aError.message);
  } else {
    console.log("Answers Table seems to have 'order_index'.");
  }
}

checkSchema();
