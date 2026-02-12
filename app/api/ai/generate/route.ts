import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import dns from "node:dns";

// Force IPv4 to resolve node fetch issues in some environments
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore if not supported
}

// Initialize OpenAI
const serviceApiKey = process.env.OPENAI_API_KEY || "";
const useGithubModels = serviceApiKey.startsWith("github_");
const baseURL = useGithubModels
  ? "https://models.inference.ai.azure.com"
  : undefined;

console.log("🔧 AI Service Config:", {
  useGithubModels,
  baseURL: baseURL || "Default (OpenAI)",
  keyPrefix: serviceApiKey.substring(0, 8) + "...",
});

const openai = new OpenAI({
  apiKey: serviceApiKey,
  baseURL: baseURL,
});

export const maxDuration = 300; // Allow 5 minutes for generation

export async function POST(req: NextRequest) {
  try {
    // DNS Diagnostic
    if (useGithubModels) {
      try {
        const host = "models.inference.ai.azure.com";
        const resolved = await dns.promises.resolve(host).catch(() => null);
        console.log(`🔍 DNS Check for ${host}:`, resolved || "FAILED");
      } catch {
        // Ignore
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key is missing. Please add it to .env.local" },
        { status: 500 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let promptContext = "";
    let sourceName = "";
    let uploadedFilePath = "";
    let fileSize = 0;

    let questionCount = 20; // Default
    let questionLanguage = "original";
    let answerLanguage = "original";

    // Handle Content-Type
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const count = formData.get("questionCount");
      const qLang = formData.get("questionLanguage");
      const aLang = formData.get("answerLanguage");

      if (count) questionCount = parseInt(count.toString()) || 20;
      if (qLang) questionLanguage = qLang.toString();
      if (aLang) answerLanguage = aLang.toString();
      // const mode = formData.get("mode") as string;

      if (!file) {
        return NextResponse.json(
          { error: "No file uploaded" },
          { status: 400 },
        );
      }
      // ... (lines 83-143)
    } else {
      // JSON body (Topic mode)
      const body = await req.json();
      const {
        topic,
        mode,
        questionCount: qCount,
        questionLanguage: qLang,
        answerLanguage: aLang,
      } = body;

      if (qCount) questionCount = parseInt(qCount) || 20;
      if (qLang) questionLanguage = qLang;
      if (aLang) answerLanguage = aLang;

      if (mode === "topic" && topic) {
        promptContext = topic; // Clean topic to avoid language bias
        sourceName = topic;
      } else {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
    }

    // Limit context length (approx 50k chars to capture more body content)
    const truncatedContext = promptContext.slice(0, 50000);

    // Call OpenAI
    const systemPrompt = `You are an expert educational quiz generator.

    CRITICAL INSTRUCTION: Analyze the provided text content deeply.
    1. IGNORE all metadata, inclusive of: Author names, Translators, Publishers, page numbers, Copyright notices, Table of Contents, Acknowledgements, and Forward/Introductory praise.
    2. FOCUS EXCLUSIVELY on the core educational subject matter, facts, concepts, and definitions found in the body of the text.
    3. Generate questions that test understanding of the MATERIAL, not the book's structure or authorship. (e.g. Do NOT ask "How many pages are in this book?" or "Who wrote this?")

    LANGUAGE INSTRUCTION:
    - DETECT the language of the user's provided input text (Context) or Topic.

    [QUESTION LANGUAGE LOGIC]
    - Preference: "${questionLanguage}"
    - If preference is "english", generate ALL Questions in English.
    - If preference is "original", match the DETECTED input language.

    [ANSWER LANGUAGE LOGIC]
    - Preference: "${answerLanguage}"
    - If preference is "english", generate ALL Answers in English.
    - If preference is "original", match the DETECTED input language.

    EXAMPLE SCENARIOS:
    1. Input: Arabic, Q: English, A: English -> Return English Qs & As.
    2. Input: Arabic, Q: Original, A: Original -> Return Arabic Qs & As.
    3. Input: Arabic, Q: English, A: Original -> Return English Questions with Arabic Answers.

    OUTPUT FORMAT:
    The response MUST be a valid JSON object with the following schema:
    {
        "title": "String (Descriptive title regarding the specific TOPIC, not just the book name)",
        "description": "String (Summary of the key concepts covered in this quiz)",
        "questions": [
            {
                "title": "String (The question text)",
                "time_limit": 20,
                "points_multiplier": 1,
                "question_type": "quiz",
                "answers": [
                    { "text": "String (Answer A)", "is_correct": boolean },
                    { "text": "String (Answer B)", "is_correct": boolean },
                    { "text": "String (Answer C)", "is_correct": boolean },
                    { "text": "String (Answer D)", "is_correct": boolean }
                ]
            }
        ]
    }

    REQUIREMENTS:
    - Generate EXACTLY ${questionCount} questions.
    - Ensure "questions" is an array.
    - Questions must be CHALLENGING and properly formatted.
    - For Arabic, ensure correct grammar.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Context:\n${truncatedContext}` },
      ],
    });

    const content = completion.choices[0].message.content;
    console.log("🤖 AI Response Content:", content);
    if (!content) throw new Error("No AI response");

    const quizData = JSON.parse(content);
    console.log("📦 Parsed Quiz Data:", JSON.stringify(quizData, null, 2));

    if (
      !quizData.questions ||
      !Array.isArray(quizData.questions) ||
      quizData.questions.length === 0
    ) {
      console.error(
        "❌ AI returned invalid structure: 'questions' array is missing or empty.",
      );
      throw new Error(
        "AI failed to generate valid questions. Please try again.",
      );
    }

    // Save to Database
    // 1. Create Quiz
    console.log("📝 Creating Quiz Shell...");
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: quizData.title.slice(0, 255) || `AI Quiz: ${sourceName}`,
        description: quizData.description || "Generated by AI",
        creator_id: user.id,
        status: "draft",
      })
      .select()
      .single();

    if (quizError || !quiz)
      throw quizError || new Error("Failed to create quiz");

    // Save Source Document Reference
    if (uploadedFilePath) {
      console.log("💾 Saving source document metadata...");
      const { error: docError } = await supabase
        .from("source_documents")
        .insert({
          user_id: user.id,
          name: sourceName,
          file_path: uploadedFilePath,
          file_type: sourceName.split(".").pop()?.toLowerCase() || "unknown",
          file_size: fileSize,
          quiz_id: quiz.id,
        });
      if (docError)
        console.error("❌ Failed to save source document:", docError);
      else console.log("✅ Source document metadata saved.");
    }

    // 2. Create Questions & Answers
    if (quizData.questions && Array.isArray(quizData.questions)) {
      console.log(`🔄 Processing ${quizData.questions.length} questions...`);
      for (const [index, q] of quizData.questions.entries()) {
        console.log(
          `  - Inserting Question ${index + 1}: ${q.title.substring(0, 30)}...`,
        );
        const { data: question, error: qError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quiz.id,
            title: q.title,
            time_limit: q.time_limit || 20,
            points_multiplier: q.points_multiplier || 1,
            question_type: q.question_type || "quiz",
            order_index: index,
          })
          .select()
          .single();

        if (qError || !question) {
          console.error("❌ Error inserting question:", qError);
          continue;
        }

        const answers = q.answers.map(
          (a: { text: string; is_correct: boolean }, i: number) => ({
            question_id: question.id,
            text: a.text,
            is_correct: a.is_correct,
            order_index: i,
            color:
              i === 0 ? "red" : i === 1 ? "blue" : i === 2 ? "yellow" : "green",
          }),
        );

        const { error: ansError } = await supabase
          .from("answers")
          .insert(answers);
        if (ansError) console.error("❌ Error inserting answers:", ansError);
      }
    }

    return NextResponse.json({ success: true, quizId: quiz.id });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("AI Generation Error Full:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (error?.response) {
      console.error("OpenAI API Error:", error.response.data);
    }
    return NextResponse.json(
      {
        error: error.message || "Internal Server Error",
        details: JSON.stringify(error),
      },
      { status: 500 },
    );
  }
}
