import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import PDFParser from "pdf2json";
import dns from "node:dns";
import { getUserAccessContext } from "@/lib/access";

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

// Initialize Groq (Fast LPU)
const groqApiKey = process.env.GROQ_API_KEY || "";
const groq = new OpenAI({
  apiKey: groqApiKey,
  baseURL: "https://api.groq.com/openai/v1",
});

// Initialize OpenRouter
const openrouterApiKey = process.env.OPENROUTER_API_KEY || "";
const openrouter = new OpenAI({
  apiKey: openrouterApiKey,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://murajiah.app", // Optional
    "X-Title": "Murajiah", // Optional
  },
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

    const access = await getUserAccessContext();
    if (access.tier === "FREE") {
      return NextResponse.json(
        {
          error:
            "AI Generation is a Premium feature. Please upgrade your account to use this.",
        },
        { status: 403 },
      );
    }

    let promptContext = "";
    let sourceName = "";
    let uploadedFilePath = "";
    let fileSize = 0;

    let questionCount = 20; // Default
    let questionLanguage = "original";
    let answerLanguage = "original";
    let aiProvider: "google" | "openai" | "groq" | "openrouter_nemotron" = "openai";
    let questionPreference = "mixed";
    let answerPreference = "mixed";

    // Handle Content-Type
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const count = formData.get("questionCount");
      const qLang = formData.get("questionLanguage");
      const aLang = formData.get("answerLanguage");
      const aiProv = formData.get("aiProvider");
      const qPref = formData.get("questionPreference");
      const aPref = formData.get("answerPreference");

      if (count) questionCount = parseInt(count.toString()) || 20;
      if (qLang) questionLanguage = qLang.toString();
      if (aLang) answerLanguage = aLang.toString();
      if (aiProv)
        aiProvider = aiProv.toString() as "google" | "openai" | "groq";
      if (qPref) questionPreference = qPref.toString();
      if (aPref) answerPreference = aPref.toString();
      // const mode = formData.get("mode") as string;

      if (!file) {
        return NextResponse.json(
          { error: "No file uploaded" },
          { status: 400 },
        );
      }
      sourceName = file.name;
      fileSize = file.size;

      // Upload to Supabase Storage
      const storagePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (!uploadError) {
        uploadedFilePath = storagePath;
        console.log("✅ File uploaded to storage:", uploadedFilePath);
      } else {
        console.error("❌ Storage upload failed:", uploadError);
      }

      // Extract text content based on file type
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileType = file.type || "";

      if (fileType === "application/pdf" || file.name.endsWith(".pdf")) {
        try {
          // pdf2json doesn't have good types, using any with suppression
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfParser = new (PDFParser as any)(null, 1);

          const pdfText = await new Promise<string>((resolve, reject) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            pdfParser.on("pdfParser_dataError", (errData: any) =>
              reject(errData?.parserError || new Error("PDF parse error")),
            );
            pdfParser.on("pdfParser_dataReady", () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              resolve((pdfParser as any).getRawTextContent());
            });
            pdfParser.parseBuffer(buffer);
          });
          promptContext = pdfText;
        } catch (err) {
          console.error("❌ PDF extraction error:", err);
          throw new Error("Failed to extract text from PDF");
        }
      } else if (
        fileType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        try {
          const result = await mammoth.extractRawText({ buffer });
          promptContext = result.value;
        } catch (err) {
          console.error("❌ Word extraction error:", err);
          throw new Error("Failed to extract text from Word document");
        }
      } else if (
        fileType ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.name.endsWith(".xlsx")
      ) {
        try {
          const workbook = XLSX.read(buffer, { type: "buffer" });
          let extractedText = "";
          workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            extractedText += XLSX.utils.sheet_to_txt(sheet) + "\n";
          });
          promptContext = extractedText;
        } catch (err) {
          console.error("❌ Excel extraction error:", err);
          throw new Error("Failed to extract text from Excel file");
        }
      } else {
        // Fallback for plain text
        promptContext = buffer.toString("utf-8");
      }
    } else {
      // JSON body (Topic mode)
      const body = await req.json();
      const {
        topic,
        mode,
        questionCount: qCount,
        questionLanguage: qLang,
        answerLanguage: aLang,
        aiProvider: aiProv,
        questionPreference: qPref,
        answerPreference: aPref,
      } = body;

      if (qCount) questionCount = parseInt(qCount) || 20;
      if (qLang) questionLanguage = qLang;
      if (aLang) answerLanguage = aLang;
      if (aiProv) aiProvider = aiProv as "google" | "openai" | "groq" | "openrouter_nemotron";
      if (qPref) questionPreference = qPref;
      if (aPref) answerPreference = aPref;

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
    3. Generate questions that test understanding of the MATERIAL / TOPIC, not the text's structure, authorship, or the prompt itself. 
    4. NEVER ask "meta-questions" such as "What is the subject of this quiz?", "What word was provided?", "What is the topic of the text?", or "How many pages are in this book?".
    5. Treat short, single-word inputs (like "pen", "photosynthesis") as a TOPIC to generate deep, factual questions about, NOT as an isolated piece of text to be identified.

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

    [QUESTION AND ANSWER STYLE PREFERENCE]
    - Requested Question Style: "${questionPreference}"
    - Requested Answer Style: "${answerPreference}"
    
    STYLE COMPLIANCE RULES:
    1. If Question Style is "mixed", use a variety of "quiz", "true_false", "type_answer", and "puzzle".
    2. If Question Style is specific (e.g., "true_false", "puzzle"), use that format for EVERY question.
    3. If Answer Style is "choice", always provide exactly 4 plausibile options for "quiz" type, and 2 for "true_false".
    4. If Answer Style is "text", favor "type_answer" where the user must type the answer.
    5. "puzzle" (Ordering) questions MUST have 4 answers, ALL marked "is_correct": true, with "order_index" (0 to 3) indicating the correct sequence.
    6. "true_false" questions MUST have exactly 2 options: "True" and "False".

    [ANSWER SOURCE FIDELITY]
    [ANSWER SOURCE FIDELITY]
    CRITICAL: The Correct Answer text MUST be a direct copy (verbatim quote) from the provided source text.
    - If a direct quote is not practical, you MUST ensure the correct answer is an undeniable fact found EXCLUSIVELY in the provided text.
    - Do not invent facts or answers not present in the text.
    - Distractors (incorrect answers) should be plausible but clearly incorrect based on the text.

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
    REQUIREMENTS:
    - Generate EXACTLY ${questionCount} questions. If there is not enough source material, provide more depth to reach the requested count.
    - Ensure "questions" is an array.
    - Questions must be CHALLENGING and properly formatted.
    - Answers must be SHORT and CONCISE, strictly UNDER 50 characters to fit on mobile screens.
    - For Arabic, ensure correct grammar.`;

    let content: string | null = null;

    if (aiProvider === "groq") {
      if (!groqApiKey) {
        return NextResponse.json(
          { error: "Groq API Key is missing. Please add it to .env.local" },
          { status: 500 },
        );
      }
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context:\n${truncatedContext}` },
        ],
      });
      content = completion.choices[0].message.content;
    } else if (aiProvider === "openrouter_nemotron") {
      if (!openrouterApiKey) {
        return NextResponse.json(
          { error: "OpenRouter API Key is missing. Please add it to .env.local" },
          { status: 500 },
        );
      }
      const model = "nvidia/nemotron-3-super-120b-a12b";

      const completion = await openrouter.chat.completions.create({
        model: model,
        response_format: { type: "json_object" },
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context:\n${truncatedContext}` },
        ],
      });
      content = completion.choices[0].message.content;
    } else if (aiProvider === "openai") {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context:\n${truncatedContext}` },
        ],
      });
      content = completion.choices[0].message.content;
    } else {
      // Google Gemini
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return NextResponse.json(
          {
            error:
              "Google Gemini API Key is missing. Please add it to .env.local",
          },
          { status: 500 },
        );
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `System Instructions:\n${systemPrompt}\n\nContext:\n${truncatedContext}`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          temperature: 0.7,
        },
      });
      content = response.text || null;
    }

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
          console.error(`❌ Error inserting question ${index + 1}:`, qError);
          // throw new Error(`Failed to save question ${index + 1}: ${qError?.message}`);
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
  } catch (error: unknown) {
    const err = error as { 
      message?: string; 
      status?: number; 
      response?: { data?: unknown };
    };
    console.error("AI Generation Error Full:", err);
    if (err?.response?.data) {
      console.error("AI API Error Details:", err.response.data);
    }

    // Check for 429 Quota Exceeded Rate Limit
    if (
      err?.status === 429 ||
      err?.message?.includes("exceeded your current quota") ||
      err?.message?.includes("RESOURCE_EXHAUSTED")
    ) {
      console.error("AI API Rate Limit Exceeded");
      return NextResponse.json(
        {
          error:
            "AI generation quota exceeded. Please wait a minute and try again, or switch to a different model.",
        },
        { status: 429 },
      );
    }

    // Check if it's the Node.js IPv6 "fetch failed" bug or a connection error
    if (err?.message?.includes("fetch failed")) {
      console.error(
        "Network Fetch Error (Likely IPv6 or DNS issue connecting to AI Provider)",
      );
      return NextResponse.json(
        {
          error:
            "Failed to connect to the AI service. This might be a network or DNS issue on the server. Try again later.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        error: err.message || "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
