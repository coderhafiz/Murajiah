import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// Initialize OpenAI
const apiKey = process.env.OPENAI_API_KEY || "";
const isGitHubKey = apiKey.startsWith("github_");

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: isGitHubKey ? "https://models.inference.ai.azure.com" : undefined,
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

    let sourceName = "";
    let uploadedFilePath = "";
    let fileSize = 0;
    let dataUrl = "";

    let questionCount = 20;
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
      const qPref = formData.get("questionPreference");
      const aPref = formData.get("answerPreference");
      const strictnessVal = formData.get("strictness");
      const aiProv = formData.get("aiProvider");
      const qOrder = formData.get("questionOrder");
      isExtraction = formData.get("isExtraction") === "true";

      if (aiProv)
        aiProvider = aiProv.toString() as "google" | "openai" | "groq" | "openrouter_nemotron";
      
      if (strictnessVal) strictness = strictnessVal.toString();

      if (count) questionCount = parseInt(count.toString()) || 20;
      if (qLang) questionLanguage = qLang.toString();
      if (aLang) answerLanguage = aLang.toString();
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

      if (!file) {
        return NextResponse.json(
          { error: "No file uploaded" },
          { status: 400 },
        );
      }
      // ... (Lines 52-76)
      sourceName = file.name;
      fileSize = file.size;

      // Upload to Supabase Storage (for record keeping)
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
        // Continue even if storage fails, we can still generate the quiz
      }

      // 🔄 Convert to Base64 for Direct AI Processing
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = buffer.toString("base64");
      dataUrl = `data:${file.type};base64,${base64Image}`;
    } else {
      return NextResponse.json(
        { error: "Invalid request type" },
        { status: 400 },
      );
    }

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


    const extractionSystemPrompt = `You are a Literal Question Extractor for visual content. 
    Your ONLY goal is to identify and extract PRE-EXISTING questions and their corresponding answers from the provided image/photo.
    
    CRITICAL RULES:
    3. EXPORT EXACTLY what you see. If a question is incomplete or cut off, extract it as is.
    4. DETECT TYPES: Automatically detect the question type from the image:
       - If it has A, B, C, D options -> "quiz"
       - If it has True/False options -> "true_false"
       - If it is a blank or short answer -> "type_answer"
       - If it is a matching/ordering question -> "puzzle"
    5. MULTIPLE CHOICE (quiz): Extract ALL options. ONLY mark the actual correct one as 'is_correct': true.
    6. SHORT ANSWER (type_answer): Extract ALL acceptable variants. Mark ALL as 'is_correct': true.
    7. EXTRACT ALL: Do not limit the number of questions. Extract every single question visible in the image.
    8. Format the output into the required JSON structure below.
    9. Maintain the original language of the text in the image.
    10. If no clear questions are found in the image, return an empty 'questions' array.
    
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

    const systemPrompt = isExtraction ? extractionSystemPrompt : `You are an expert educational quiz generator specializing in analyzing visual content.
    
    ${questionCount === 1 ? 'REGENERATION MODE: You are currently regenerating a SINGLE question based on a provided image or existing question. Your task is to provide a FRESH, DISTINCT, and HIGH-QUALITY version. Do NOT just repeat the same content; provide a new angle or better distractors. Ensure BOTH the question text and ALL answer options are regenerated.' : ''}

    CRITICAL INSTRUCTION: Analyze the provided image deeply.
    1. IGNORE irrelevant visual noise (page borders, shadows).
    2. FOCUS EXCLUSIVELY on the educational text, diagrams, and charts visible in the image.
    3. Generate questions that test understanding of the material shown.

    [CONTENT ORDERING]
    ${
      questionOrder === "sequential"
        ? "- CRITICAL: Generate questions in the EXACT sequence that the topics appear in the provided image (typically top-to-bottom or left-to-right). Question 1 should be from the first visual topic."
        : "- Generate questions that cover the visual material in a mixed, non-linear order to better test overall comprehension."
    }

    [CREATIVITY AND SCOPE INSTRUCTION]
    - Strictness Level: "${strictness}"
    ${
      strictness === "strict"
        ? "- CRITICAL: Formulate questions STRICTLY within the scope of what is explicitly taught or shown in the provided image."
        : "- Formulate primary questions based on the image, but you are allowed to be creative and include relevant outside knowledge or broader conceptual questions related to the topic if it enhances the educational value."
    }

    LANGUAGE INSTRUCTION: 
    - DETECT the primary language of the text visible in the image.
    
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
    6. For "type_answer" type: provide exactly 1 answer with the correct text. (Only if "text" is allowed).
    7. For "puzzle" (Ordering) type: Provide 4 answers, all marked "is_correct": true, with "order_index" (0-3). (Only if "choice" is allowed).

    [ANSWER FIDELITY]
    - CRITICAL: Correct answers MUST be a direct verbatim quote from the source text/image.
    - If a quote is impossible, use an undeniable fact EXCLUSIVELY from the source.
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
    - COUNT: ${isExtraction ? 'Extract all visible questions' : `EXACTLY ${questionCount} questions. Exhaust every angle (Why, How, etc) to reach count without inventing facts.`}
    - ANGLES: DIVERSE interrogative angles (Why, How, Where, When, Who, etc). No "What" dominance.
    - CRITICAL VARIETY: You MUST mathematically RANDOMIZE the position (index 0 to 3) of the correct answer ("is_correct": true) for each question. Do NOT make the first answer correct every time.
    - Ensure "questions" is an array.
    - CRITICAL LANGUAGE CHECK: Ensure EVERY single string (title, description, question titles, answer texts) is strictly written in the target language dictated by the LANGUAGE INSTRUCTION. Do NOT mix English grammar with foreign words.
    - Questions must be CHALLENGING and properly formatted.`;

    let content: string | null = null;

    if (aiProvider === "groq") {
      if (!groqApiKey) {
        return NextResponse.json(
          { error: "Groq API Key is missing. Please add it to .env.local" },
          { status: 500 },
        );
      }
      const completion = await groq.chat.completions.create({
        model: "llama-3.2-11b-vision-preview",
        response_format: { type: "json_object" },
        max_tokens: 6000, // Groq free tier TPM limit is 12,000 (input + output). Keep output budget at 6000 to leave headroom for input tokens.
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Generate a quiz based on this educational image.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
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
      // Note: Nemotron 3 Super is text-only. Using Llama 3.2 11B Vision as a high-quality free fallback.
      const model = "meta-llama/llama-3.2-11b-vision-preview:free";

      const completion = await openrouter.chat.completions.create({
        model: model,
        response_format: { type: "json_object" },
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Generate a quiz based on this educational image.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      });
      content = completion.choices[0].message.content;
    } else if (aiProvider === "google") {
      // Google Gemini 2.0 Flash Vision
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
      const base64Data = dataUrl.split(",")[1];

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `System Instructions:\n${systemPrompt}\n\nTask: Generate a quiz based on this educational image in JSON format.`,
              },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: "image/jpeg",
                },
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
    } else {
      // Default to OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Generate a quiz based on this educational image.",
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      });
      content = completion.choices[0].message.content;
    }
    console.log("🤖 AI Vision Response Content:", content);
    if (!content) throw new Error("No AI response");

    const quizData = JSON.parse(content);

    if (
      !quizData.questions ||
      !Array.isArray(quizData.questions) ||
      quizData.questions.length === 0
    ) {
      throw new Error("AI failed to generate valid questions.");
    }

    // Clamp to exactly the requested question count — AI may over- or under-generate.
    // SKIP filters if isExtraction is true — we want exactly what's in the document.
    if (!isExtraction) {
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
    
    console.log(`✅ Returning ${quizData.questions.length} vision questions${isExtraction ? " (EXTRACTED ALL)" : ` (requested: ${questionCount})`}.`);

    // Save to Database (Same logic as main route)
    // 1. Create Quiz
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: (quizData.title || `Extracted: ${sourceName || "Image Quiz"}`).slice(0, 255),
        description: quizData.description || "Generated from image",
        creator_id: user.id,
        status: "draft",
      })
      .select()
      .single();

    if (quizError || !quiz)
      throw quizError || new Error("Failed to create quiz");

    // Save Source Document Reference
    if (uploadedFilePath) {
      await supabase.from("source_documents").insert({
        user_id: user.id,
        name: sourceName,
        file_path: uploadedFilePath,
        file_type: sourceName.split(".").pop()?.toLowerCase() || "image",
        file_size: fileSize,
        quiz_id: quiz.id,
      });
    }

    // 2. Create Questions & Answers
    if (quizData.questions && Array.isArray(quizData.questions)) {
      for (const [index, q] of quizData.questions.entries()) {
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
          console.error(
            `❌ Error inserting vision question ${index + 1}:`,
            qError,
          );
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

        await supabase.from("answers").insert(answers);
      }
    }

    return NextResponse.json({ success: true, quizId: quiz.id, questions: quizData.questions });
  } catch (error: unknown) {
    const err = error as { 
      message?: string; 
      status?: number; 
      response?: { data?: unknown };
    };
    console.error("Vision AI Error:", err);

    // Specific troubleshooting for GitHub Personal Access Token 401 errors
    if (err?.status === 401 && process.env.OPENAI_API_KEY?.startsWith("github_")) {
      return NextResponse.json(
        {
          error: "Your GitHub Personal Access Token (PAT) is missing the 'Models' permission. Please edit your token on GitHub and enable 'Account Permissions' -> 'Models' -> 'Read-only'.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

