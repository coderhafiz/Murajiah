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
      const aiProv = formData.get("aiProvider");

      if (aiProv)
        aiProvider = aiProv.toString() as "google" | "openai" | "groq" | "openrouter_nemotron";

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
    // Call OpenAI
    const systemPrompt = `You are an expert educational quiz generator specializing in analyzing visual content.

    CRITICAL INSTRUCTION: Analyze the provided image deeply.
    1. IGNORE irrelevant visual noise (page borders, shadows).
    2. FOCUS EXCLUSIVELY on the educational text, diagrams, and charts visible in the image.
    3. Generate questions that test understanding of the material shown.

    LANGUAGE INSTRUCTION: 
    - DETECT the language of the text visible in the image.
    
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
    - Allowed Question Types: ${questionPreference.join(", ")}
    - Allowed Answer Formats: ${answerPreference.join(", ")}
    
    STYLE COMPLIANCE RULES:
    1. Only use question types from the "Allowed Question Types" list.
    2. If multiple question types are allowed, use a diverse mix across the quiz.
    3. For "quiz" (Multiple Choice) type:
       - If "choice" is allowed in "Answer Formats", always provide exactly 4 plausible options.
       - If only "text" is allowed, provide a single correct answer for the user to type.
    4. For "true_false" type: Always provide exactly 2 options: "True" and "False".
    5. For "type_answer" type: Do not provide decoys; provide the exact correct text for the user to type.
    6. For "puzzle" (Ordering) type: Provide 4 answers, ALL marked "is_correct": true, with "order_index" (0 to 3) indicating the correct sequence.
    7. Respect the "Answer Formats": 
       - "choice" means multiple choice selection.
       - "text" means the user must type the answer. 
       - If both are allowed, use a mix.

    OUTPUT FORMAT:
    The response MUST be a valid JSON object with the following schema:
    {
        "title": "String (Descriptive title based on the image topic)",
        "description": "String (Summary of the concepts shown)",
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
    - Generate EXACTLY ${questionCount} questions. If there is not enough visual material, provide more depth and detailed questions to reach the count.
    - Ensure "questions" is an array.
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
        max_tokens: 4096,
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
        max_tokens: 4096,
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
        max_tokens: 4096,
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

    // Save to Database (Same logic as main route)
    // 1. Create Quiz
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .insert({
        title: quizData.title.slice(0, 255) || `Visual Quiz: ${sourceName}`,
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
            title: q.title,
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

        await supabase.from("answers").insert(answers);
      }
    }

    return NextResponse.json({ success: true, quizId: quiz.id });
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
