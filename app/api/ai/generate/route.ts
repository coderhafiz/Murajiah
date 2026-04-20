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
    let questionPreference: string[] = ["quiz", "true_false", "type_answer", "puzzle"];
    let answerPreference: string[] = ["choice", "text"];
    let strictness = "strict";
    let questionOrder = "mix";
    let isExtraction = false;

    // Handle Content-Type
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const count = formData.get("questionCount");
      const qLang = formData.get("questionLanguage");
      const aLang = formData.get("answerLanguage");
      const aiProv = formData.get("aiProvider");
      const strictnessVal = formData.get("strictness");
      const qPref = formData.get("questionPreference");
      const aPref = formData.get("answerPreference");
      const qOrder = formData.get("questionOrder");
      isExtraction = formData.get("isExtraction") === "true";

      if (count) questionCount = parseInt(count.toString()) || 20;
      if (qLang) questionLanguage = qLang.toString();
      if (aLang) answerLanguage = aLang.toString();
      if (aiProv)
        aiProvider = aiProv.toString() as "google" | "openai" | "groq" | "openrouter_nemotron";
      if (strictnessVal) strictness = strictnessVal.toString();
      if (qPref) {
        try {
          questionPreference = JSON.parse(qPref.toString());
        } catch {
          questionPreference = [qPref.toString()];
        }
      }
      if (aPref) {
        try {
          answerPreference = JSON.parse(aPref.toString());
        } catch {
          answerPreference = [aPref.toString()];
        }
      }
      if (qOrder) questionOrder = qOrder.toString();
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
        strictness: strictVal,
        questionPreference: qPref,
        answerPreference: aPref,
        questionOrder: qOrder,
        isExtraction: isExt,
      } = body;

      if (isExt === true) isExtraction = true;

      if (qCount) questionCount = parseInt(qCount) || 20;
      if (qLang) questionLanguage = qLang;
      if (aLang) answerLanguage = aLang;
      if (aiProv) aiProvider = aiProv as "google" | "openai" | "groq" | "openrouter_nemotron";
      if (strictVal) strictness = strictVal;
      if (qPref) {
        try {
          questionPreference = typeof qPref === "string" ? JSON.parse(qPref) : qPref;
        } catch {
          questionPreference = [qPref];
        }
      }
      if (aPref) {
        try {
          answerPreference = typeof aPref === "string" ? JSON.parse(aPref) : aPref;
        } catch {
          answerPreference = [aPref];
        }
      }
      if (qOrder) questionOrder = qOrder;

      if (mode === "topic" && topic) {
        promptContext = topic; // Clean topic to avoid language bias
        sourceName = topic;
      } else {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
    }

    // Limit context length based on provider token limits.
    // Groq free tier: 12,000 TPM ceiling (input + output). Input context must be small.
    //   ~20,000 chars ≈ 5,000 tokens + ~1,000 system prompt + 6,000 output = ~12,000 total ✅
    // Other providers: 50,000 chars is safe.
    const maxContextChars = aiProvider === "groq" ? 20000 : 50000;
    const truncatedContext = promptContext.slice(0, maxContextChars);

    // Call OpenAI
    // Determine compatible question types based on selected answer formats
    const supportedByChoice = ["quiz", "true_false", "puzzle"];
    const supportedByText = ["quiz", "type_answer"];
    
    let compatibleTypes: string[] = [];
    if (answerPreference.includes("choice")) compatibleTypes = [...new Set([...compatibleTypes, ...supportedByChoice])];
    if (answerPreference.includes("text")) compatibleTypes = [...new Set([...compatibleTypes, ...supportedByText])];

    // The actual allowed types are those the user selected that are supported by their chosen answer formats
    const effectiveAllowedTypes = questionPreference.filter(t => compatibleTypes.includes(t));
    
    // If for some reason nothing is compatible, fallback to the user's question choice
    const finalAllowedTypes = effectiveAllowedTypes.length > 0 ? effectiveAllowedTypes : questionPreference;

    const allQuestionTypes = ["quiz", "true_false", "type_answer", "puzzle"];
    const excludedTypes = allQuestionTypes.filter(t => !finalAllowedTypes.includes(t));
    const excludedTypesStr = excludedTypes.length > 0
      ? `PROHIBITED (DO NOT USE): ${excludedTypes.join(", ")}`
      : "None";


    const extractionSystemPrompt = `You are a Literal Question Extractor. 
    Your ONLY goal is to find and extract PRE-EXISTING questions and their corresponding answers from the provided document.
    
    CRITICAL RULES:
    1. DO NOT generate new questions or concepts.
    2. DO NOT modify the text of found questions or answers. Keep them VERBATIM.
    3. EXPORT EXACTLY what you see. If a question is incomplete, extract it as is.
    4. DETECT TYPES: Automatically detect the question type from the document layout:
       - If it has A, B, C, D options -> "quiz"
       - If it has True/False options -> "true_false"
       - If it is a blank or short answer -> "type_answer"
       - If it is a matching/ordering question -> "puzzle"
    5. MULTIPLE CHOICE (quiz): Extract ALL options. ONLY mark the actual correct one as 'is_correct': true.
    6. SHORT ANSWER (type_answer): Extract ALL acceptable variants. Mark ALL as 'is_correct': true.
    7. EXTRACT ALL: Do not limit the number of questions. Extract every single question found in the document.
    8. Format the output into the required JSON structure below.
    9. Maintain the original language of the document.
    10. If no clear questions are found, return an empty 'questions' array.
    
    REQUIRED JSON STRUCTURE (STRICT):
    {
      "title": "A title for the quiz",
      "description": "A brief description",
      "questions": [
        {
          "title": "Verbatim question text",
          "question_type": "quiz | true_false | type_answer | puzzle",
          "answers": [
            { "text": "Option A / True / First Answer", "is_correct": true/false },
            { "text": "Option B / False / Second Answer", "is_correct": true/false }
          ]
        }
      ]
    }`;

    const systemPrompt = isExtraction ? extractionSystemPrompt : `You are an expert educational quiz generator.
    
    ${questionCount === 1 ? 'REGENERATION MODE: You are currently regenerating a SINGLE question based on a provided topic or existing question. Your task is to provide a FRESH, DISTINCT, and HIGH-QUALITY version. Do NOT just repeat the same content; provide a new angle or better distractors. Ensure BOTH the question text and ALL answer options are regenerated.' : ''}

    DEEP ANALYSIS REQUIRED:
    1. IGNORE metadata (Authors, Page #s, Publishers, Table of Contents, Intro/Forward).
    2. FOCUS EXCLUSIVELY on core subject matter, facts, and concepts in the text body.
    3. Test understanding of TOPIC/MATERIAL, not the text's structure or meta-info.
    4. Prohibited: "What is the topic?", "What word was provided?", "How many pages?".
    5. Treat short inputs (e.g. "Cells") as a topic for deep factual questions, not as text to identify.

    [CONTENT ORDERING]
    ${
      questionOrder === "sequential"
        ? "- CRITICAL: Generate questions in the EXACT sequence that the topics appear in the provided text. Question 1 should be from the beginning, and the last question should be from the end."
        : "- Generate questions that cover the material in a mixed, non-linear order to better test overall comprehension."
    }

    [CREATIVITY & SCOPE]
    - Level: "${strictness}"
    ${
      strictness === "strict"
        ? "- CRITICAL: ONLY use facts explicitly mentioned in the provided text."
        : "- Focus on text, but you MAY include relevant outside knowledge or broader conceptual questions."
    }

    LANGUAGE INSTRUCTION:
    - DETECT the primary language of the user's provided input text (Context) or Topic.

    [QUESTION LANGUAGE LOGIC]
    - Preference: "${questionLanguage}"
    - If preference is "english", generate ALL Questions ENTIRELY in English.
    - If preference is "original", you MUST generate ALL Questions ENTIRELY in the PRIMARY language detected from the source text. For example, if the source text is predominantly Arabic, the questions MUST be fully formulated and written in Arabic, NOT in English with Arabic terms mixed in.

    [ANSWER LANGUAGE LOGIC]
    - Preference: "${answerLanguage}"
    - If preference is "english", generate ALL Answers ENTIRELY in English.
    - If preference is "original", you MUST generate ALL Answers ENTIRELY in the PRIMARY language detected from the source text.

    EXAMPLE SCENARIOS:
    1. Input: Arabic, Q: English, A: English -> Return English Qs & As.
    2. Input: Arabic, Q: Original, A: Original -> Return fully Arabic Qs & fully Arabic As.
    3. Input: Arabic, Q: English, A: Original -> Return English Questions with Arabic Answers.

    [QUESTION AND ANSWER STYLE PREFERENCE]
    - Allowed Question Types (USE ONLY THESE): ${finalAllowedTypes.join(", ")}
    - ${excludedTypesStr}
    - Allowed Answer Formats (STRICT ADHERENCE): ${answerPreference.join(", ")}    
    STYLE COMPLIANCE RULES:
    1. STRICT QUESTION TYPE: Only use question types from "Allowed Question Types".
    2. STRICT ANSWER FORMAT: 
       - If "choice" is in "Answer Formats", use multiple-choice selection with 4 options for "quiz".
       - If "text" is in "Answer Formats", use simple text entry for "type_answer" or "quiz" (no decoys).
    3. BALANCE RULE: distribute allowed question types as EVENLY as possible. No single type should dominate.
    4. For "quiz" (Multiple Choice) type:
       - If "choice" is allowed: always provide EXACTLY 4 plausible options.
       - If only "text" is allowed: provide exactly 1 correct answer (no options).
    5. For "true_false" type: Always provide exactly 2 options: "True" and "False". (Only used if "choice" is allowed).
    6. For "type_answer" type: provide exactly 1 answer with the correct text. (Only used if "text" is allowed).
    7. For "puzzle" (Ordering) type: Provide 4 answers, all marked "is_correct": true, with "order_index" (0-3). (Only used if "choice" is allowed).

    [ANSWER FIDELITY]
    - CRITICAL: Correct answers MUST be a direct verbatim quote from source text.
    - If a quote is impossible, use an undeniable fact EXCLUSIVELY from the text.
    - NEVER invent facts. Distractors must be plausible but clearly wrong.

    OUTPUT FORMAT:
    The response MUST be a valid JSON object. Use the correct schema for each question_type:

    For "quiz" (multiple choice) questions:
    { "title": "Question text", "time_limit": 20, "points_multiplier": 1, "question_type": "quiz", "answers": [
        { "text": "Option A", "is_correct": false },
        { "text": "Option B", "is_correct": true },
        { "text": "Option C", "is_correct": false },
        { "text": "Option D", "is_correct": false }
    ]}

    For "type_answer" (typed text input) questions:
    { "title": "Question text", "time_limit": 20, "points_multiplier": 1, "question_type": "type_answer", "answers": [
        { "text": "The exact correct answer the user should type", "is_correct": true }
    ]}

    For "true_false" questions:
    { "title": "Question text", "time_limit": 20, "points_multiplier": 1, "question_type": "true_false", "answers": [
        { "text": "True", "is_correct": true },
        { "text": "False", "is_correct": false }
    ]}

    Wrap all questions in:
    {
        "title": "String (Title in the REQUIRED language)",
        "description": "String (Summary in the REQUIRED language)",
        "questions": [ ...questions here... ]
    }

    REQUIREMENTS:
    - COUNT: ${isExtraction ? 'Extract all available questions' : `EXACTLY ${questionCount} questions. Exhaust every angle (Why, How, etc) to reach count without inventing facts.`}
    - ANGLES: DIVERSE interrogative angles (Why, How, Where, When, Who, etc). No "What" dominance.
    - CRITICAL VARIETY: You MUST mathematically RANDOMIZE the position (index 0 to 3) of the correct answer ("is_correct": true) for each question. Do NOT make the first answer correct every time.
    - Ensure "questions" is an array.
    - CRITICAL LANGUAGE CHECK: Ensure EVERY single string (title, description, question titles, answer texts) is strictly written in the target language dictated by the LANGUAGE INSTRUCTION. Do NOT mix English grammar with foreign words.
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
        max_tokens: 6000, // Groq free tier TPM limit is 12,000 (input + output). Keep output budget at 6000 to leave headroom for input tokens.
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
        max_tokens: 8192,
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
        max_tokens: 8192,
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

    // ── Server-side enforcement of user's type/format preferences ──────────
    // Filter out questions whose type the user did not select.
    // SKIP filters if isExtraction is true — we want exactly what is in the document.
    if (isExtraction === false) {
      if (questionPreference.length > 0) {
        quizData.questions = quizData.questions.filter((q: { question_type: string }) =>
          questionPreference.includes(q.question_type)
        );
      }
      if (answerPreference.length === 1) {
        if (answerPreference[0] === "choice") {
          quizData.questions = quizData.questions.filter(
            (q: { question_type: string }) => q.question_type !== "type_answer"
          );
        } else if (answerPreference[0] === "text") {
          quizData.questions = quizData.questions.filter(
            (q: { question_type: string }) =>
              q.question_type !== "true_false" && q.question_type !== "puzzle"
          );
        }
      }
      quizData.questions = quizData.questions.slice(0, questionCount);
    }
    console.log(`✅ Returning ${quizData.questions.length} questions${isExtraction ? " (EXTRACTED ALL)" : ` (requested: ${questionCount})`}.`);

    // 1. Create Quiz
    console.log("📝 Creating Quiz Shell...");
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: (quizData.title || `Extracted: ${sourceName || "Quiz"}`).slice(0, 255),
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
          `  - Inserting Question ${index + 1}: ${(q.title || "No Title").substring(0, 30)}...`,
        );
        const { data: question, error: qError } = await supabase
          .from("questions")
          .insert({
            quiz_id: quiz.id,
            title: q.title || "Untitled Question",
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

        const answers = (q.answers || []).map(
          (a: { text: string; is_correct: boolean }, i: number) => ({
            question_id: question.id,
            text: a.text || "No Answer Text",
            is_correct: !!a.is_correct,
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

    return NextResponse.json({ success: true, quizId: quiz.id, questions: quizData.questions });
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

    // Specific troubleshooting for GitHub Personal Access Token 401 errors (Permisson Scopes)
    if (err?.status === 401 && process.env.OPENAI_API_KEY?.startsWith("github_")) {
      return NextResponse.json(
        {
          error: "Your GitHub Personal Access Token (PAT) is missing the 'Models' permission. Please edit your token on GitHub and enable 'Account Permissions' -> 'Models' -> 'Read-only'.",
        },
        { status: 401 }
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
